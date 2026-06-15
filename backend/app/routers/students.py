from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.dependencies.auth import get_current_active_user, RoleChecker
from app.models import models
from app.schemas import schemas
from datetime import datetime
from typing import Optional
from sqlalchemy import func

router = APIRouter(prefix="/students", tags=["students"])

def generate_student_id(db: Session) -> str:
    year = datetime.now().year
    count = db.query(models.Student).count()
    return f"VIS{year}{count + 1:04d}"

@router.get("/", response_model=list[schemas.StudentResponse])
def get_students(
    class_id: Optional[int] = None,
    status: Optional[str] = None,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    query = db.query(models.Student)

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

    else:
        if class_id is not None:
            query = query.filter(models.Student.class_id == class_id)

    if status is not None:
        query = query.filter(models.Student.status == status)

    students = query.all()

    for s in students:
        s.class_name = s.student_class.name if s.student_class else "Unknown"

        total_paid = db.query(
            func.coalesce(func.sum(models.Payment.amount_paid), 0)
        ).filter(
            models.Payment.student_id == s.id
        ).scalar()

        s.total_paid = total_paid
        s.pending_fee = s.annual_fee - total_paid

    return students
    

@router.get("/{student_id_or_uuid}", response_model=schemas.StudentResponse)
def get_student_by_id(
    student_id_or_uuid: str,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    student = db.query(models.Student).filter(
        (models.Student.id == student_id_or_uuid) | (models.Student.student_id == student_id_or_uuid)
    ).first()
    
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
        
    # Enforce role restrictions
    if current_user.role == "Teacher":
        teacher_profile = current_user.teacher_profile
        if not teacher_profile or student.class_id != teacher_profile.assigned_class_id:
            raise HTTPException(status_code=403, detail="Access denied: Student is not in your assigned class.")
    elif current_user.role == "Parent":
        parent_profile = current_user.parent_profile
        if not parent_profile or student.family_id != parent_profile.family_id:
            raise HTTPException(status_code=403, detail="Access denied: Student does not belong to your family ID.")
            
    student.class_name = student.student_class.name if student.student_class else "Unknown"
    return student

@router.post("/", response_model=schemas.StudentResponse)
def create_student(
    student_in: schemas.StudentCreate,
    current_user: models.User = Depends(RoleChecker(["Admin", "Teacher", "Receptionist"])),
    db: Session = Depends(get_db)
):
    # Enforce Teacher limits
    if current_user.role == "Teacher":
        teacher_profile = current_user.teacher_profile
        if not teacher_profile:
            raise HTTPException(status_code=403, detail="Teacher profile not setup")
        # Teachers can only create students in their assigned class
        if student_in.class_id != teacher_profile.assigned_class_id:
            raise HTTPException(status_code=403, detail="Teachers can only add students to their assigned class.")
            
    # Check if admission number is unique
    existing = db.query(models.Student).filter(models.Student.admission_number == student_in.admission_number).first()
    if existing:
        raise HTTPException(status_code=400, detail="Admission number already exists")
        
    new_student = models.Student(
        student_id=generate_student_id(db),
        admission_number=student_in.admission_number,
        name=student_in.name,
        photo_url=student_in.photo_url,
        date_of_birth=student_in.date_of_birth,
        gender=student_in.gender,
        father_name=student_in.father_name,
        mother_name=student_in.mother_name,
        address=student_in.address,
        contact_number=student_in.contact_number,
        emergency_contact=student_in.emergency_contact,
        bus_number=student_in.bus_number,
        bus_route=student_in.bus_route,
        annual_fee=student_in.annual_fee,
        family_id=student_in.family_id,
        class_id=student_in.class_id,
        status=student_in.status or "active"
    )
    
    db.add(new_student)
    db.commit()
    db.refresh(new_student)
    new_student.class_name = new_student.student_class.name if new_student.student_class else "Unknown"
    return new_student

@router.put("/{student_id}", response_model=schemas.StudentResponse)
def update_student(
    student_id: str,
    student_in: schemas.StudentUpdate,
    current_user: models.User = Depends(RoleChecker(["Admin", "Teacher", "Receptionist"])),
    db: Session = Depends(get_db)
):
    student = db.query(models.Student).filter(models.Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
        
    # Enforce Teacher limits
    if current_user.role == "Teacher":
        teacher_profile = current_user.teacher_profile
        if not teacher_profile:
            raise HTTPException(status_code=403, detail="Teacher profile not setup")
        # Teachers can only edit students in their assigned class
        if student.class_id != teacher_profile.assigned_class_id:
            raise HTTPException(status_code=403, detail="Teachers can only edit students in their assigned class.")
        # Teachers cannot move students to another class
        if student_in.class_id is not None and student_in.class_id != teacher_profile.assigned_class_id:
            raise HTTPException(status_code=403, detail="Teachers cannot transfer students to another class.")

    # Apply updates
    update_data = student_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(student, field, value)
        
    db.commit()
    db.refresh(student)
    student.class_name = student.student_class.name if student.student_class else "Unknown"
    return student

@router.delete("/{student_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_student(
    student_id: str,
    current_user: models.User = Depends(RoleChecker(["Admin"])), # ADMIN ONLY
    db: Session = Depends(get_db)
):
    student = db.query(models.Student).filter(models.Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
        
    db.delete(student)
    db.commit()
    return None
