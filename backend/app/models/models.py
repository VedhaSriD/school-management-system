import uuid
from datetime import datetime, date
from sqlalchemy import Column, String, Integer, Boolean, ForeignKey, Date, DateTime, Numeric
from sqlalchemy.orm import relationship
from app.core.database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    username = Column(String(50), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False) # Admin, Teacher, Receptionist, Parent
    full_name = Column(String(100), nullable=False)
    email = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    teacher_profile = relationship("Teacher", back_populates="user", uselist=False)
    parent_profile = relationship("ParentAccess", back_populates="user", uselist=False)

class Class(Base):
    __tablename__ = "classes"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(20), unique=True, nullable=False) # e.g. Nursery, Class 1, Class 10
    class_group = Column(String(20), nullable=False) # e.g. Nursery/KG, Primary, Secondary
    
    students = relationship("Student", back_populates="student_class")
    teachers = relationship("Teacher", back_populates="assigned_class")

class Teacher(Base):
    __tablename__ = "teachers"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), unique=True, nullable=False)
    assigned_class_id = Column(Integer, ForeignKey("classes.id"), nullable=False)
    
    user = relationship("User", back_populates="teacher_profile")
    assigned_class = relationship("Class", back_populates="teachers")

class Student(Base):
    __tablename__ = "students"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    student_id = Column(String(20), unique=True, nullable=False, index=True) # Auto-generated VISxxxx
    admission_number = Column(String(20), unique=True, nullable=False, index=True)
    name = Column(String(100), nullable=False)
    photo_url = Column(String(255), nullable=True)
    date_of_birth = Column(Date, nullable=False)
    gender = Column(String(10), nullable=False)
    father_name = Column(String(100), nullable=False)
    mother_name = Column(String(100), nullable=False)
    address = Column(String(255), nullable=False)
    contact_number = Column(String(20), nullable=False)
    emergency_contact = Column(String(20), nullable=False)
    bus_number = Column(String(20), nullable=True)
    bus_route = Column(String(100), nullable=True)
    annual_fee = Column(Numeric(10, 2), nullable=False)
    family_id = Column(String(50), nullable=False, index=True)
    class_id = Column(Integer, ForeignKey("classes.id"), nullable=False)
    status = Column(String(10), default="active") # active, inactive
    hall_ticket_approved = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    student_class = relationship("Class", back_populates="students")
    payments = relationship("Payment", back_populates="student", cascade="all, delete-orphan")
    marks = relationship("Mark", back_populates="student", cascade="all, delete-orphan")

class Payment(Base):
    __tablename__ = "payments"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    student_id = Column(String(36), ForeignKey("students.id"), nullable=False)
    amount_paid = Column(Numeric(10, 2), nullable=False)
    payment_date = Column(Date, default=date.today)
    payment_method = Column(String(20), nullable=False) # Cash, Card, Online
    receipt_number = Column(String(50), unique=True, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    student = relationship("Student", back_populates="payments")

class Mark(Base):
    __tablename__ = "marks"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    student_id = Column(String(36), ForeignKey("students.id"), nullable=False)
    exam_type = Column(String(10), nullable=False) # FA-1, FA-2, SA-1, FA-3, FA-4, SA-2
    subject = Column(String(20), nullable=False) # Telugu, Hindi, English, Maths, Science, Social
    marks_obtained = Column(Integer, nullable=False)
    max_marks = Column(Integer, default=100)
    teacher_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    status = Column(String(15), default="draft") # draft, submitted, approved
    edit_count = Column(Integer, default=0) # Tracks number of edits by teacher (max 2)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    student = relationship("Student", back_populates="marks")

class ParentAccess(Base):
    __tablename__ = "parent_access"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    parent_user_id = Column(String(36), ForeignKey("users.id"), unique=True, nullable=False)
    family_id = Column(String(50), nullable=False, index=True)
    
    user = relationship("User", back_populates="parent_profile")
