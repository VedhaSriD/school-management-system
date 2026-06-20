from pydantic import BaseModel, Field
from datetime import date, datetime
from typing import Optional, List
from decimal import Decimal

# --- AUTH SCHEMAS ---
class LoginRequest(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    username: str
    name: str
    class_id: Optional[int] = None

class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None

class UserBase(BaseModel):
    username: str
    full_name: str
    email: Optional[str] = None
    role: str
    is_active: Optional[bool] = True

class UserCreate(UserBase):
    password: str
    assigned_class_id: Optional[int] = None
    family_id: Optional[str] = None

class UserResponse(UserBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True

# --- CLASS SCHEMAS ---
class ClassBase(BaseModel):
    id: int
    name: str
    class_group: str

class ClassResponse(ClassBase):
    class Config:
        from_attributes = True

# --- STUDENT SCHEMAS ---
class StudentBase(BaseModel):
    admission_number: str
    name: str
    photo_url: Optional[str] = None
    date_of_birth: date
    gender: str
    father_name: str
    mother_name: str
    address: str
    contact_number: str
    emergency_contact: str
    bus_number: Optional[str] = None
    bus_route: Optional[str] = None
    annual_fee: Decimal = Field(..., ge=0)
    family_id: str
    class_id: int
    status: Optional[str] = "active"

class StudentCreate(StudentBase):
    pass

class StudentUpdate(BaseModel):
    name: Optional[str] = None
    photo_url: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    father_name: Optional[str] = None
    mother_name: Optional[str] = None
    address: Optional[str] = None
    contact_number: Optional[str] = None
    emergency_contact: Optional[str] = None
    bus_number: Optional[str] = None
    bus_route: Optional[str] = None
    annual_fee: Optional[Decimal] = None
    family_id: Optional[str] = None
    class_id: Optional[int] = None
    status: Optional[str] = None

class StudentResponse(StudentBase):
    id: str
    student_id: str
    hall_ticket_approved: bool
    created_at: datetime
    updated_at: datetime
    class_name: Optional[str] = None
    total_paid: Decimal = Decimal("0.00")
    pending_fee: Decimal = Decimal("0.00")

    class Config:
        from_attributes = True

# --- PAYMENT SCHEMAS ---
class PaymentBase(BaseModel):
    student_id: str
    amount_paid: Decimal = Field(..., gt=0)
    payment_date: date
    payment_method: str

class PaymentCreate(PaymentBase):
    pass

class PaymentResponse(PaymentBase):
    id: str
    receipt_number: str
    created_at: datetime
    student_name: Optional[str] = None

    class Config:
        from_attributes = True

# --- MARKS SCHEMAS ---
class MarkBase(BaseModel):
    student_id: str
    exam_type: str
    subject: str
    marks_obtained: int = Field(..., ge=0, le=100)
    max_marks: Optional[int] = 100

class MarkCreate(MarkBase):
    pass

class MarkUpdate(BaseModel):
    marks_obtained: int = Field(..., ge=0, le=100)

class MarkResponse(MarkBase):
    id: str
    teacher_id: str
    status: str
    edit_count: int
    created_at: datetime
    updated_at: datetime
    student_name: Optional[str] = None

    class Config:
        from_attributes = True

# --- DASHBOARD & ANALYTICS SCHEMAS ---
class AdminDashboardStats(BaseModel):
    total_students: int
    active_students: int
    total_teachers: int
    total_fees_expected: Decimal
    total_fees_collected: Decimal
    total_fees_pending: Decimal
    class_wise_student_counts: dict[str, int]

class TeacherDashboardStats(BaseModel):
    class_name: str
    total_students: int
    active_students: int
    pending_marks_entries_count: int
    recent_marks: List[MarkResponse]

class ReceptionistDashboardStats(BaseModel):
    total_payments_today: Decimal
    total_payments_count_today: int
    pending_hall_ticket_approvals: int
    recent_payments: List[PaymentResponse]

class ParentDashboardStats(BaseModel):
    family_id: str
    students: List[StudentResponse]
    fees_summary: dict[str, dict[str, Decimal]]

# --- EXPENSE SCHEMAS ---
EXPENSE_CATEGORIES = [
    "Bus Diesel", "Bus Maintenance", "Stationery", "Electricity",
    "Water", "Internet", "Salary", "Repair", "Printing", "Event", "Miscellaneous",
]

EXPENSE_PAYMENT_MODES = ["Cash", "Bank Transfer", "UPI", "Cheque"]


class ExpenseCreate(BaseModel):
    expense_date: date
    amount: Decimal = Field(..., gt=0)
    category: str
    description: str = Field(..., min_length=1, max_length=255)
    payment_mode: str
    paid_to: Optional[str] = Field(default=None, max_length=100)
    notes: Optional[str] = None


class ExpenseUpdate(BaseModel):
    expense_date: Optional[date] = None
    amount: Optional[Decimal] = None
    category: Optional[str] = None
    description: Optional[str] = Field(default=None, min_length=1, max_length=255)
    payment_mode: Optional[str] = None
    paid_to: Optional[str] = Field(default=None, max_length=100)
    notes: Optional[str] = None

    def model_post_init(self, __context):
        if self.amount is not None and self.amount <= 0:
            raise ValueError("amount must be greater than 0")


class ExpenseResponse(BaseModel):
    id: str
    expense_date: date
    amount: Decimal
    category: str
    description: str
    payment_mode: str
    paid_to: Optional[str] = None
    notes: Optional[str] = None
    is_void: bool
    created_by_user_id: str
    created_by_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ExpenseSummary(BaseModel):
    today_total: Decimal
    month_total: Decimal
    today_count: int
    month_count: int
    category_totals: dict[str, Decimal]


# --- NOTIFICATION SCHEMAS ---
class NotificationResponse(BaseModel):
    id: str
    family_id: str
    student_name: str
    amount_paid: Decimal
    receipt_number: str
    payment_date: date
    remaining_due: Decimal
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


class UnreadCountResponse(BaseModel):
    count: int