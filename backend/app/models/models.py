import uuid
from datetime import datetime, date
from sqlalchemy import Column, String, Integer, Boolean, ForeignKey, Date, DateTime, Numeric, Text
from sqlalchemy.orm import relationship
from app.core.database import Base


class ReceiptSequence(Base):
    """
    Single-row counter table for receipt number generation.
    Always contains exactly one row with id=1.
    Locked with SELECT FOR UPDATE during payment creation to prevent
    duplicate receipt numbers under concurrent requests.
    """
    __tablename__ = "receipt_sequence"

    id = Column(Integer, primary_key=True)
    last_number = Column(Integer, nullable=False, default=0)


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    username = Column(String(50), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False)
    full_name = Column(String(100), nullable=False)
    email = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    teacher_profile = relationship("Teacher", back_populates="user", uselist=False)
    parent_profile = relationship("ParentAccess", back_populates="user", uselist=False)


class Class(Base):
    __tablename__ = "classes"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(20), unique=True, nullable=False)
    class_group = Column(String(20), nullable=False)

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
    student_id = Column(String(20), unique=True, nullable=False, index=True)
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
    status = Column(String(10), default="active")
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
    payment_method = Column(String(20), nullable=False)
    receipt_number = Column(String(50), unique=True, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    student = relationship("Student", back_populates="payments")


class Mark(Base):
    __tablename__ = "marks"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    student_id = Column(String(36), ForeignKey("students.id"), nullable=False)
    exam_type = Column(String(10), nullable=False)
    subject = Column(String(20), nullable=False)
    marks_obtained = Column(Integer, nullable=False)
    max_marks = Column(Integer, default=100)
    teacher_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    status = Column(String(15), default="draft")
    edit_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    student = relationship("Student", back_populates="marks")


class ParentAccess(Base):
    __tablename__ = "parent_access"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    parent_user_id = Column(String(36), ForeignKey("users.id"), unique=True, nullable=False)
    family_id = Column(String(50), nullable=False, index=True)

    user = relationship("User", back_populates="parent_profile")


class Expense(Base):
    __tablename__ = "expenses"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    expense_date = Column(Date, nullable=False, default=date.today, index=True)
    amount = Column(Numeric(10, 2), nullable=False)
    category = Column(String(50), nullable=False, index=True)
    description = Column(String(255), nullable=False)
    payment_mode = Column(String(20), nullable=False)
    paid_to = Column(String(100), nullable=True)
    notes = Column(Text, nullable=True)
    is_void = Column(Boolean, default=False, nullable=False)
    created_by_user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    created_by = relationship("User", foreign_keys=[created_by_user_id])


# ── NEW: Parent Fee Notifications ────────────────────────────────────────────
class Notification(Base):
    """
    Stores one in-app notification per fee payment, addressed to the
    parent of the paying student via family_id.

    Intentionally denormalized: student_name, receipt_number, amounts are
    copied at creation time so the record remains readable even if the
    related student or payment record is later modified or deleted.

    No FK to payments or students — this is a message record, not a join target.
    family_id links it to the parent via ParentAccess.family_id.
    """
    __tablename__ = "notifications"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    family_id = Column(String(50), nullable=False, index=True)
    student_name = Column(String(100), nullable=False)
    amount_paid = Column(Numeric(10, 2), nullable=False)
    receipt_number = Column(String(50), nullable=False)
    payment_date = Column(Date, nullable=False)
    remaining_due = Column(Numeric(10, 2), nullable=False)
    is_read = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)