from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import verify_password, get_password_hash, create_access_token
from app.dependencies.auth import get_current_active_user, RoleChecker
from app.models import models
from app.schemas import schemas

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/login", response_model=schemas.Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    class_id = None
    if user.role == "Teacher" and user.teacher_profile:
        class_id = user.teacher_profile.assigned_class_id
        
    access_token = create_access_token(data={"sub": user.username, "role": user.role})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role,
        "username": user.username,
        "name": user.full_name,
        "class_id": class_id
    }

@router.get("/me", response_model=schemas.UserResponse)
def read_users_me(current_user: models.User = Depends(get_current_active_user)):
    return current_user

@router.post("/register", response_model=schemas.UserResponse, dependencies=[Depends(RoleChecker(["Admin"]))])
def register_user(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.username == user_in.username).first()
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )
        
    hashed_password = get_password_hash(user_in.password)
    user = models.User(
        username=user_in.username,
        password_hash=hashed_password,
        role=user_in.role,
        full_name=user_in.full_name,
        email=user_in.email,
        is_active=user_in.is_active
    )
    db.add(user)
    db.flush() # Flush to get user.id
    
    if user_in.role == "Teacher":
        if not user_in.assigned_class_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="assigned_class_id is required for Teacher role"
            )
        # Check if class exists
        class_exists = db.query(models.Class).filter(models.Class.id == user_in.assigned_class_id).first()
        if not class_exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Assigned class not found"
            )
        teacher = models.Teacher(user_id=user.id, assigned_class_id=user_in.assigned_class_id)
        db.add(teacher)
    elif user_in.role == "Parent":
        if not user_in.family_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="family_id is required for Parent role"
            )
        parent = models.ParentAccess(parent_user_id=user.id, family_id=user_in.family_id)
        db.add(parent)
        
    db.commit()
    db.refresh(user)
    return user
