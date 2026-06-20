from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import extract
from datetime import date, datetime
from typing import List, Optional
from decimal import Decimal

from app.core.database import get_db
from app.dependencies.auth import get_current_active_user, RoleChecker
from app.models.models import Expense, User
from app.schemas.schemas import ExpenseCreate, ExpenseUpdate, ExpenseResponse, ExpenseSummary

router = APIRouter(
    prefix="/expenses",
    tags=["expenses"]
)


def _to_response(exp: Expense) -> ExpenseResponse:
    return ExpenseResponse(
        id=exp.id,
        expense_date=exp.expense_date,
        amount=exp.amount,
        category=exp.category,
        description=exp.description,
        payment_mode=exp.payment_mode,
        paid_to=exp.paid_to,
        notes=exp.notes,
        is_void=exp.is_void,
        created_by_user_id=exp.created_by_user_id,
        created_by_name=exp.created_by.full_name if exp.created_by else None,
        created_at=exp.created_at,
        updated_at=exp.updated_at,
    )


def _query_active(db: Session):
    """Base query: active (non-voided) expenses with creator eager-loaded."""
    return (
        db.query(Expense)
        .options(joinedload(Expense.created_by))
        .filter(Expense.is_void == False)
    )


@router.post("/", response_model=ExpenseResponse, dependencies=[Depends(RoleChecker(["Admin"]))])
def create_expense(
    data: ExpenseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    expense = Expense(
        expense_date=data.expense_date,
        amount=data.amount,
        category=data.category,
        description=data.description,
        payment_mode=data.payment_mode,
        paid_to=data.paid_to,
        notes=data.notes,
        created_by_user_id=current_user.id,
    )
    db.add(expense)
    db.commit()
    db.refresh(expense)
    # Re-query with eager load so created_by is accessible
    expense = _query_active(db).filter(Expense.id == expense.id).first()
    return _to_response(expense)


@router.get("/summary", response_model=ExpenseSummary, dependencies=[Depends(RoleChecker(["Admin"]))])
def get_expense_summary(db: Session = Depends(get_db)):
    today = date.today()
    current_month = today.month
    current_year = today.year

    base_q = db.query(Expense).filter(Expense.is_void == False)

    today_expenses = base_q.filter(Expense.expense_date == today).all()
    month_expenses = base_q.filter(
        extract("month", Expense.expense_date) == current_month,
        extract("year", Expense.expense_date) == current_year,
    ).all()

    today_total = sum((e.amount for e in today_expenses), Decimal("0.00"))
    month_total = sum((e.amount for e in month_expenses), Decimal("0.00"))

    category_totals: dict[str, Decimal] = {}
    for e in month_expenses:
        category_totals[e.category] = category_totals.get(e.category, Decimal("0.00")) + e.amount

    return ExpenseSummary(
        today_total=today_total,
        month_total=month_total,
        today_count=len(today_expenses),
        month_count=len(month_expenses),
        category_totals=category_totals,
    )


@router.get("/", response_model=List[ExpenseResponse], dependencies=[Depends(RoleChecker(["Admin"]))])
def list_expenses(
    category: Optional[str] = Query(None),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
):
    q = _query_active(db)
    if category:
        q = q.filter(Expense.category == category)
    if date_from:
        q = q.filter(Expense.expense_date >= date_from)
    if date_to:
        q = q.filter(Expense.expense_date <= date_to)
    expenses = q.order_by(Expense.expense_date.desc(), Expense.created_at.desc()).offset(skip).limit(limit).all()
    return [_to_response(e) for e in expenses]


@router.get("/{expense_id}", response_model=ExpenseResponse, dependencies=[Depends(RoleChecker(["Admin"]))])
def get_expense(expense_id: str, db: Session = Depends(get_db)):
    expense = _query_active(db).filter(Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    return _to_response(expense)


@router.put("/{expense_id}", response_model=ExpenseResponse, dependencies=[Depends(RoleChecker(["Admin"]))])
def update_expense(expense_id: str, data: ExpenseUpdate, db: Session = Depends(get_db)):
    expense = _query_active(db).filter(Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(expense, field, value)
    expense.updated_at = datetime.utcnow()
    db.commit()
    expense = _query_active(db).filter(Expense.id == expense_id).first()
    return _to_response(expense)


@router.delete("/{expense_id}", dependencies=[Depends(RoleChecker(["Admin"]))])
def void_expense(expense_id: str, db: Session = Depends(get_db)):
    expense = db.query(Expense).filter(Expense.id == expense_id, Expense.is_void == False).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    expense.is_void = True
    expense.updated_at = datetime.utcnow()
    db.commit()
    return {"detail": "Expense voided successfully"}