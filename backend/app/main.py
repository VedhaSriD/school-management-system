from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func
from decimal import Decimal
from typing import List
import re

from app.core.config import settings
from app.core.database import Base, engine, get_db, SessionLocal
from app.dependencies.auth import get_current_active_user, RoleChecker
from app.models import models
from app.schemas import schemas
from app.routers import auth, students, fees, marks, pdf, ai_assistant, expenses, notifications  # ← ADDED notifications
from datetime import date


def _seed_receipt_sequence():
    db = SessionLocal()
    try:
        existing = db.query(models.ReceiptSequence).filter(
            models.ReceiptSequence.id == 1
        ).first()
        if existing is not None:
            return

        rows = db.query(models.Payment.receipt_number).all()
        pattern = re.compile(r"^REC-\d{4}-(\d+)$")
        max_counter = max(
            (int(m.group(1)) for (r,) in rows if (m := pattern.match(r))),
            default=0
        )

        db.add(models.ReceiptSequence(id=1, last_number=max_counter))
        db.commit()
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    _seed_receipt_sequence()
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="A Cloud-Based School Management System for Vedha International School",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://school-management-system-beige.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health", tags=["health"])
def health_check():
    return {"status": "healthy", "school": "Vedha International School"}


@app.get("/api/classes", response_model=List[schemas.ClassResponse])
def get_classes(db: Session = Depends(get_db)):
    return db.query(models.Class).all()


@app.get("/api/dashboard/admin", response_model=schemas.AdminDashboardStats)
def get_admin_dashboard(
    current_user: models.User = Depends(RoleChecker(["Admin"])),
    db: Session = Depends(get_db)
):
    total_students = db.query(models.Student).count()
    active_students = db.query(models.Student).filter(models.Student.status == "active").count()
    total_teachers = db.query(models.User).filter(models.User.role == "Teacher").count()

    fees_expected_sum = db.query(func.sum(models.Student.annual_fee)).filter(
        models.Student.status == "active"
    ).scalar() or Decimal('0.00')
    total_fees_expected = Decimal(str(fees_expected_sum))

    fees_collected_sum = db.query(func.sum(models.Payment.amount_paid)).scalar() or Decimal('0.00')
    total_fees_collected = Decimal(str(fees_collected_sum))

    total_fees_pending = max(Decimal('0.00'), total_fees_expected - total_fees_collected)

    class_counts_query = db.query(
        models.Class.name,
        func.count(models.Student.id)
    ).join(models.Student).filter(models.Student.status == "active").group_by(models.Class.name).all()

    class_wise_student_counts = {name: count for name, count in class_counts_query}
    for c in db.query(models.Class).all():
        if c.name not in class_wise_student_counts:
            class_wise_student_counts[c.name] = 0

    return {
        "total_students": total_students,
        "active_students": active_students,
        "total_teachers": total_teachers,
        "total_fees_expected": total_fees_expected,
        "total_fees_collected": total_fees_collected,
        "total_fees_pending": total_fees_pending,
        "class_wise_student_counts": class_wise_student_counts
    }


@app.get("/api/dashboard/teacher", response_model=schemas.TeacherDashboardStats)
def get_teacher_dashboard(
    current_user: models.User = Depends(RoleChecker(["Teacher"])),
    db: Session = Depends(get_db)
):
    teacher_profile = current_user.teacher_profile
    if not teacher_profile:
        raise HTTPException(status_code=403, detail="Teacher profile not initialized")

    class_id = teacher_profile.assigned_class_id
    class_obj = db.query(models.Class).filter(models.Class.id == class_id).first()
    class_name = class_obj.name if class_obj else "Assigned Class"

    total_students = db.query(models.Student).filter(models.Student.class_id == class_id).count()
    active_students = db.query(models.Student).filter(
        models.Student.class_id == class_id,
        models.Student.status == "active"
    ).count()

    pending_marks = db.query(models.Mark).join(models.Student).filter(
        models.Student.class_id == class_id,
        models.Mark.status == "draft"
    ).count()

    recent_marks_db = db.query(models.Mark).join(models.Student).filter(
        models.Student.class_id == class_id
    ).order_by(models.Mark.updated_at.desc()).limit(5).all()

    recent_marks = []
    for m in recent_marks_db:
        m.student_name = m.student.name
        recent_marks.append(m)

    return {
        "class_name": class_name,
        "total_students": total_students,
        "active_students": active_students,
        "pending_marks_entries_count": pending_marks,
        "recent_marks": recent_marks
    }


@app.get("/api/dashboard/receptionist", response_model=schemas.ReceptionistDashboardStats)
def get_receptionist_dashboard(
    current_user: models.User = Depends(RoleChecker(["Receptionist"])),
    db: Session = Depends(get_db)
):
    today = func.current_date()
    if engine.name == "sqlite":
        from datetime import date
        today = date.today()

    payments_today_sum = db.query(func.sum(models.Payment.amount_paid)).filter(
        models.Payment.payment_date == today
    ).scalar() or Decimal('0.00')

    payments_today_count = db.query(models.Payment).filter(
        models.Payment.payment_date == today
    ).count()

    all_active = db.query(models.Student).filter(
        models.Student.status == "active",
        models.Student.hall_ticket_approved == False
    ).all()

    eligible_count = 0
    for s in all_active:
        paid = db.query(func.sum(models.Payment.amount_paid)).filter(
            models.Payment.student_id == s.id
        ).scalar() or Decimal('0.00')
        if s.annual_fee - paid <= 0:
            eligible_count += 1

    recent_payments_db = db.query(models.Payment).order_by(
        models.Payment.created_at.desc()
    ).limit(5).all()
    recent_payments = []
    for p in recent_payments_db:
        p.student_name = p.student.name
        recent_payments.append(p)

    return {
        "total_payments_today": Decimal(str(payments_today_sum)),
        "total_payments_count_today": payments_today_count,
        "pending_hall_ticket_approvals": eligible_count,
        "recent_payments": recent_payments
    }


@app.get("/api/dashboard/parent", response_model=schemas.ParentDashboardStats)
def get_parent_dashboard(
    current_user: models.User = Depends(RoleChecker(["Parent"])),
    db: Session = Depends(get_db)
):
    parent_profile = current_user.parent_profile
    if not parent_profile:
        raise HTTPException(status_code=403, detail="Parent profile not initialized")

    family_id = parent_profile.family_id

    students = db.query(models.Student).filter(
        models.Student.family_id == family_id,
        models.Student.status == "active"
    ).all()

    fees_summary = {}
    for s in students:
        s.class_name = s.student_class.name if s.student_class else "Unknown"

        paid = db.query(func.sum(models.Payment.amount_paid)).filter(
            models.Payment.student_id == s.id
        ).scalar() or Decimal('0.00')

        paid_dec = Decimal(str(paid))
        expected_dec = Decimal(str(s.annual_fee))
        pending_dec = max(Decimal('0.00'), expected_dec - paid_dec)

        fees_summary[s.id] = {
            "expected": expected_dec,
            "paid": paid_dec,
            "pending": pending_dec
        }

    return {
        "family_id": family_id,
        "students": students,
        "fees_summary": fees_summary
    }


# Include routers
app.include_router(auth.router, prefix="/api")
app.include_router(students.router, prefix="/api")
app.include_router(fees.router, prefix="/api")
app.include_router(marks.router, prefix="/api")
app.include_router(pdf.router, prefix="/api")
app.include_router(ai_assistant.router, prefix="/api")
app.include_router(expenses.router, prefix="/api")
app.include_router(notifications.router, prefix="/api")  # ← ADDED