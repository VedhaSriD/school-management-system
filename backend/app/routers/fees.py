from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.dependencies.auth import get_current_active_user, RoleChecker
from app.models import models
from app.schemas import schemas
from datetime import datetime, date
from decimal import Decimal
from typing import Optional

router = APIRouter(prefix="/fees", tags=["fees"])

def generate_receipt_number(db: Session) -> str:
    year = datetime.now().year
    count = db.query(models.Payment).count()
    return f"REC-{year}-{count + 1:05d}"

@router.post("/payments", response_model=schemas.PaymentResponse)
def collect_payment(
    payment_in: schemas.PaymentCreate,
    current_user: models.User = Depends(RoleChecker(["Admin", "Receptionist"])),
    db: Session = Depends(get_db)
):
    student = db.query(models.Student).filter(models.Student.id == payment_in.student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
        
    # Calculate outstanding balance before adding this payment
    payments_sum = db.query(func.sum(models.Payment.amount_paid)).filter(
        models.Payment.student_id == student.id
    ).scalar() or Decimal('0.00')
    
    total_paid_before = Decimal(str(payments_sum))
    pending_before = student.annual_fee - total_paid_before
    
    # Validation: Cannot pay more than pending fee
    if payment_in.amount_paid > pending_before:
        raise HTTPException(
            status_code=400,
            detail=f"Amount paid ({payment_in.amount_paid}) exceeds outstanding fee ({pending_before})"
        )
        
    payment = models.Payment(
        student_id=payment_in.student_id,
        amount_paid=payment_in.amount_paid,
        payment_date=payment_in.payment_date or date.today(),
        payment_method=payment_in.payment_method,
        receipt_number=generate_receipt_number(db)
    )
    
    db.add(payment)
    db.commit()
    db.refresh(payment)
    
    payment.student_name = student.name
    return payment

@router.get("/payments", response_model=list[schemas.PaymentResponse])
def get_payments(
    student_id: Optional[str] = None,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    query = db.query(models.Payment).join(models.Student)
    
    if current_user.role == "Teacher":
        teacher_profile = current_user.teacher_profile
        if not teacher_profile:
            raise HTTPException(status_code=403, detail="Teacher profile not found")
        query = query.filter(models.Student.class_id == teacher_profile.assigned_class_id)
    elif current_user.role == "Parent":
        parent_profile = current_user.parent_profile
        if not parent_profile:
            raise HTTPException(status_code=403, detail="Parent profile not found")
        query = query.filter(models.Student.family_id == parent_profile.family_id)
    elif student_id:
        query = query.filter(models.Payment.student_id == student_id)
        
    payments = query.order_by(models.Payment.created_at.desc()).all()
    
    for p in payments:
        p.student_name = p.student.name
        
    return payments

@router.get("/status/{student_id}")
def get_fee_status(
    student_id: str,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    student = db.query(models.Student).filter(models.Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
        
    if current_user.role == "Teacher":
        teacher_profile = current_user.teacher_profile
        if not teacher_profile or student.class_id != teacher_profile.assigned_class_id:
            raise HTTPException(status_code=403, detail="Access denied: Student is not in your class.")
    elif current_user.role == "Parent":
        parent_profile = current_user.parent_profile
        if not parent_profile or student.family_id != parent_profile.family_id:
            raise HTTPException(status_code=403, detail="Access denied: Student family ID mismatch.")
            
    payments_sum = db.query(func.sum(models.Payment.amount_paid)).filter(
        models.Payment.student_id == student_id
    ).scalar() or Decimal('0.00')
    
    total_paid = Decimal(str(payments_sum))
    annual_fee = Decimal(str(student.annual_fee))
    pending_fee = annual_fee - total_paid
    
    return {
        "student_id": student.id,
        "student_name": student.name,
        "class_name": student.student_class.name if student.student_class else "Unknown",
        "annual_fee": annual_fee,
        "total_paid": total_paid,
        "pending_fee": pending_fee,
        "is_cleared": pending_fee <= 0
    }

@router.post("/hall-tickets/approve/{student_id}", response_model=schemas.StudentResponse)
def approve_hall_ticket(
    student_id: str,
    approved: bool = True,
    current_user: models.User = Depends(RoleChecker(["Admin", "Receptionist"])),
    db: Session = Depends(get_db)
):
    student = db.query(models.Student).filter(models.Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
        
    # Verify fee payment if approving
    if approved:
        payments_sum = db.query(func.sum(models.Payment.amount_paid)).filter(
            models.Payment.student_id == student.id
        ).scalar() or Decimal('0.00')
        total_paid = Decimal(str(payments_sum))
        pending_fee = student.annual_fee - total_paid
        
        # Check if outstanding dues remain
        if pending_fee > 0:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot approve hall ticket. Student has pending fee of {pending_fee}."
            )
            
    student.hall_ticket_approved = approved
    db.commit()
    db.refresh(student)
    student.class_name = student.student_class.name if student.student_class else "Unknown"
    return student
