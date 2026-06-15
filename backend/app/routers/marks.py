from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.dependencies.auth import get_current_active_user, RoleChecker
from app.models import models
from app.schemas import schemas
from typing import Optional, List

router = APIRouter(prefix="/marks", tags=["marks"])

@router.get("/", response_model=List[schemas.MarkResponse])
def get_marks(
    student_id: Optional[str] = None,
    exam_type: Optional[str] = None,
    subject: Optional[str] = None,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    query = db.query(models.Mark).join(models.Student)
    
    # Apply filters based on role
    if current_user.role == "Teacher":
        teacher_profile = current_user.teacher_profile
        if not teacher_profile:
            raise HTTPException(status_code=403, detail="Teacher profile not found")
        query = query.filter(models.Student.class_id == teacher_profile.assigned_class_id)
    elif current_user.role == "Parent":
        parent_profile = current_user.parent_profile
        if not parent_profile:
            raise HTTPException(status_code=403, detail="Parent profile not found")
        # Parents can ONLY see approved marks
        query = query.filter(
            models.Student.family_id == parent_profile.family_id,
            models.Mark.status == "approved"
        )
    elif student_id:
        query = query.filter(models.Mark.student_id == student_id)
        
    if exam_type:
        query = query.filter(models.Mark.exam_type == exam_type)
    if subject:
        query = query.filter(models.Mark.subject == subject)
        
    marks = query.order_by(models.Mark.subject, models.Mark.exam_type).all()
    
    for m in marks:
        m.student_name = m.student.name
        
    return marks

@router.post("/", response_model=schemas.MarkResponse)
def add_mark_entry(
    mark_in: schemas.MarkCreate,
    current_user: models.User = Depends(RoleChecker(["Admin", "Teacher"])),
    db: Session = Depends(get_db)
):
    student = db.query(models.Student).filter(models.Student.id == mark_in.student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
        
    # Enforce Teacher limits
    if current_user.role == "Teacher":
        teacher_profile = current_user.teacher_profile
        if not teacher_profile or student.class_id != teacher_profile.assigned_class_id:
            raise HTTPException(status_code=403, detail="Teachers can only enter marks for their assigned class.")

    # Check if a mark entry for this student, exam_type, and subject already exists
    existing = db.query(models.Mark).filter(
        models.Mark.student_id == mark_in.student_id,
        models.Mark.exam_type == mark_in.exam_type,
        models.Mark.subject == mark_in.subject
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=400,
            detail="Marks entry for this exam and subject already exists. Use the edit endpoint."
        )
        
    new_mark = models.Mark(
        student_id=mark_in.student_id,
        exam_type=mark_in.exam_type,
        subject=mark_in.subject,
        marks_obtained=mark_in.marks_obtained,
        max_marks=mark_in.max_marks or 100,
        teacher_id=current_user.id,
        status="draft",
        edit_count=0
    )
    
    db.add(new_mark)
    db.commit()
    db.refresh(new_mark)
    
    new_mark.student_name = student.name
    return new_mark

@router.put("/{mark_id}", response_model=schemas.MarkResponse)
def edit_mark_entry(
    mark_id: str,
    mark_in: schemas.MarkUpdate,
    current_user: models.User = Depends(RoleChecker(["Admin", "Teacher"])),
    db: Session = Depends(get_db)
):
    mark = db.query(models.Mark).filter(models.Mark.id == mark_id).first()
    if not mark:
        raise HTTPException(status_code=404, detail="Marks record not found")
        
    # Enforce Teacher limits
    if current_user.role == "Teacher":
        teacher_profile = current_user.teacher_profile
        if not teacher_profile or mark.student.class_id != teacher_profile.assigned_class_id:
            raise HTTPException(status_code=403, detail="Teachers can only edit marks for their assigned class.")
            
        # Check if record is approved
        if mark.status == "approved":
            raise HTTPException(
                status_code=400,
                detail="Marks are already approved by Admin and cannot be edited."
            )
            
        # Check if teacher has exceeded the 2-edit limit
        if mark.edit_count >= 2:
            raise HTTPException(
                status_code=400,
                detail="Record is locked. You have reached the maximum number of edits (2). Please contact an Admin to unlock."
            )
            
        # Increment edit count for teacher
        mark.edit_count += 1

    # Apply updates
    mark.marks_obtained = mark_in.marks_obtained
    db.commit()
    db.refresh(mark)
    
    mark.student_name = mark.student.name
    return mark

@router.post("/submit", status_code=status.HTTP_200_OK)
def submit_marks_for_approval(
    student_id: str,
    exam_type: str,
    current_user: models.User = Depends(RoleChecker(["Admin", "Teacher"])),
    db: Session = Depends(get_db)
):
    # Retrieve all draft marks for this student and exam
    marks = db.query(models.Mark).filter(
        models.Mark.student_id == student_id,
        models.Mark.exam_type == exam_type,
        models.Mark.status == "draft"
    ).all()
    
    if not marks:
        raise HTTPException(status_code=404, detail="No draft marks found for this student and exam.")
        
    for m in marks:
        m.status = "submitted"
        
    db.commit()
    return {"detail": f"Submitted {len(marks)} mark entries for approval."}

@router.post("/approve/{mark_id}", response_model=schemas.MarkResponse)
def approve_mark(
    mark_id: str,
    current_user: models.User = Depends(RoleChecker(["Admin"])), # ADMIN ONLY
    db: Session = Depends(get_db)
):
    mark = db.query(models.Mark).filter(models.Mark.id == mark_id).first()
    if not mark:
        raise HTTPException(status_code=404, detail="Marks record not found")
        
    mark.status = "approved"
    db.commit()
    db.refresh(mark)
    
    mark.student_name = mark.student.name
    return mark

@router.post("/unlock/{mark_id}", response_model=schemas.MarkResponse)
def unlock_mark(
    mark_id: str,
    current_user: models.User = Depends(RoleChecker(["Admin"])), # ADMIN ONLY
    db: Session = Depends(get_db)
):
    mark = db.query(models.Mark).filter(models.Mark.id == mark_id).first()
    if not mark:
        raise HTTPException(status_code=404, detail="Marks record not found")
        
    mark.edit_count = 0
    mark.status = "draft"
    db.commit()
    db.refresh(mark)
    
    mark.student_name = mark.student.name
    return mark
