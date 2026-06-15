from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.core.config import settings
from app.dependencies.auth import RoleChecker
from app.models import models
from pydantic import BaseModel
from datetime import date
import os

# New Google Gen AI SDK
try:
    from google import genai
    from google.genai import types
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False

router = APIRouter(prefix="/ai", tags=["ai"])

class ChatMessage(BaseModel):
    message: str

def fetch_grounded_context(query_str: str, db: Session) -> str:
    """
    Search the database for relevant entities matching terms in the query 
    to feed as grounded, read-only context to the Gemini model.
    """
    context_parts = []
    query_lower = query_str.lower()
    
    # 1. Check if asking about school overview / statistics
    if any(k in query_lower for k in ["total", "summary", "count", "metrics", "stats", "overview", "fees collected"]):
        active_count = db.query(models.Student).filter(models.Student.status == "active").count()
        inactive_count = db.query(models.Student).filter(models.Student.status == "inactive").count()
        teacher_count = db.query(models.User).filter(models.User.role == "Teacher").count()
        
        total_expected = db.query(func.sum(models.Student.annual_fee)).scalar() or 0
        total_paid = db.query(func.sum(models.Payment.amount_paid)).scalar() or 0
        total_pending = total_expected - total_paid
        
        context_parts.append(
            f"SCHOOL GENERAL STATS:\n"
            f"- Active Students: {active_count}\n"
            f"- Inactive Students: {inactive_count}\n"
            f"- Total Teachers: {teacher_count}\n"
            f"- Total Fees Expected: INR {total_expected:.2f}\n"
            f"- Total Fees Collected: INR {total_paid:.2f}\n"
            f"- Total Fees Outstanding: INR {total_pending:.2f}\n"
        )
        
    # 2. Check if asking about a specific student
    # Tokenize query to search for student names
    words = [w.strip(",.?!()\"") for w in query_str.split() if len(w) > 2]
    students_found = []
    for word in words:
        if word.lower() in ["student", "class", "route", "pending", "fees", "telugu", "hindi", "english", "maths", "science", "social"]:
            continue
        studs = db.query(models.Student).filter(
            (models.Student.name.ilike(f"%{word}%")) | 
            (models.Student.student_id.ilike(f"%{word}%")) |
            (models.Student.admission_number.ilike(f"%{word}%"))
        ).all()
        for s in studs:
            if s.id not in [x.id for x in students_found]:
                students_found.append(s)
                
    if students_found:
        context_parts.append("RELEVANT STUDENT RECORDS FOUND:")
        for s in students_found:
            payments_sum = db.query(func.sum(models.Payment.amount_paid)).filter(
                models.Payment.student_id == s.id
            ).scalar() or 0
            paid = float(payments_sum)
            pending = float(s.annual_fee) - paid
            
            # Fetch approved marks
            marks = db.query(models.Mark).filter(
                models.Mark.student_id == s.id,
                models.Mark.status == "approved"
            ).all()
            marks_str = ", ".join([f"{m.exam_type} {m.subject}: {m.marks_obtained}/{m.max_marks}" for m in marks])
            if not marks_str:
                marks_str = "No approved marks recorded."
                
            context_parts.append(
                f"- Name: {s.name} (ID: {s.student_id}, Admission No: {s.admission_number})\n"
                f"  Class: {s.student_class.name if s.student_class else 'N/A'}\n"
                f"  Status: {s.status}\n"
                f"  Parents: Father: {s.father_name}, Mother: {s.mother_name}\n"
                f"  Contact: {s.contact_number}, Emergency: {s.emergency_contact}\n"
                f"  Bus details: Bus No {s.bus_number or 'N/A'}, Route: {s.bus_route or 'N/A'}\n"
                f"  Fees: Annual: INR {s.annual_fee:.2f}, Paid: INR {paid:.2f}, Pending: INR {pending:.2f}\n"
                f"  Approved Marks: {marks_str}\n"
            )
            
    # 3. Check if asking about a class list
    classes = db.query(models.Class).all()
    for c in classes:
        if c.name.lower() in query_lower:
            class_students = db.query(models.Student).filter(
                models.Student.class_id == c.id,
                models.Student.status == "active"
            ).all()
            stud_list = ", ".join([f"{s.name} ({s.student_id})" for s in class_students])
            context_parts.append(
                f"STUDENTS IN {c.name.upper()}:\n"
                f"Count: {len(class_students)} active students\n"
                f"Roster: {stud_list if stud_list else 'No students enrolled.'}\n"
            )
            
    # 4. Check if asking about pending fees details
    if "pending fee" in query_lower or "outstanding" in query_lower or "due" in query_lower:
        pending_students = []
        all_students = db.query(models.Student).filter(models.Student.status == "active").all()
        for s in all_students:
            paid = db.query(func.sum(models.Payment.amount_paid)).filter(
                models.Payment.student_id == s.id
            ).scalar() or 0
            due = s.annual_fee - paid
            if due > 0:
                pending_students.append(f"{s.name} ({s.student_id}) - Pending: INR {due:.2f}")
        if pending_students:
            context_parts.append(
                f"ACTIVE STUDENTS WITH PENDING DUES:\n" + 
                "\n".join(pending_students[:15]) + # Limit to first 15 for context safety
                (f"\n...and {len(pending_students) - 15} more" if len(pending_students) > 15 else "")
            )
            
        # 5. Check if asking about today's fee collection
    if (
    "today" in query_lower
    and (
        "collection" in query_lower
        or "fee" in query_lower
        or "payment" in query_lower
    )
):

        today = date.today()

        today_payments = db.query(models.Payment).filter(
            models.Payment.payment_date == today
        ).all()

        if today_payments:

            total_collection = sum(float(p.amount_paid) for p in today_payments)

            cash_total = sum(
                float(p.amount_paid)
                for p in today_payments
                if p.payment_method.lower() == "cash"
            )

            card_total = sum(
                float(p.amount_paid)
                for p in today_payments
                if p.payment_method.lower() == "card"
            )

            online_total = sum(
                float(p.amount_paid)
                for p in today_payments
                if p.payment_method.lower() == "online"
            )

            payment_lines = []

            for p in today_payments:
                student = db.query(models.Student).filter(
                    models.Student.id == p.student_id
                ).first()

                payment_lines.append(
                    f"{student.name if student else 'Unknown'} - INR {float(p.amount_paid):.2f} ({p.payment_method})"
                )

            context_parts.append(
                f"TODAY'S FEE COLLECTION REPORT ({today}):\n"
                f"Total Collection: INR {total_collection:.2f}\n"
                f"Cash Collection: INR {cash_total:.2f}\n"
                f"Card Collection: INR {card_total:.2f}\n"
                f"Online Collection: INR {online_total:.2f}\n\n"
                f"Payments Received:\n"
                + "\n".join(payment_lines)
            )

    # 6. Check if asking about bus routes
    if "bus" in query_lower or "route" in query_lower:
        routes_query = db.query(
            models.Student.bus_route,
            models.Student.bus_number,
            func.count(models.Student.id)
        ).filter(
            models.Student.status == "active",
            models.Student.bus_route != None
        ).group_by(
            models.Student.bus_route,
            models.Student.bus_number
        ).all()

        if routes_query:
            routes_str = "\n".join([
                f"- Route: {r[0]} (Bus: {r[1]}) - {r[2]} students"
                for r in routes_query
            ])
            context_parts.append(
                f"SCHOOL BUS ROUTE STATS:\n{routes_str}"
            )

    return "\n\n".join(context_parts)

@router.post("/chat")
def chat_with_assistant(
    payload: ChatMessage,
    current_user: models.User = Depends(RoleChecker(["Admin"])), # ADMIN ONLY
    db: Session = Depends(get_db)
):
    if not settings.GEMINI_API_KEY:
        # Fallback simulation if no API Key is provided
        context = fetch_grounded_context(payload.message, db)
        return {
            "response": (
                "⚠️ **[Simulated Response - Gemini API Key Not Configured]**\n\n"
                f"Here is the database context found matching your query:\n\n{context or 'No specific student, class, or fee context found matching the search terms.'}\n\n"
                "Please configure `GEMINI_API_KEY` in your backend environment variables to enable full natural language responses."
            )
        }
        
    if not GEMINI_AVAILABLE:
        raise HTTPException(
            status_code=500,
            detail="The google-genai library is not installed or import failed."
        )

    # 1. Fetch live read-only context from the database
    db_context = fetch_grounded_context(payload.message, db)
    print("DB CONTEXT:", db_context)
    
    # 2. System Instruction ensuring read-only, helpful persona
    system_instruction = (
        "You are the senior Admin AI Assistant for Vedha International School.\n"
        "Your role is to assist administrators by answering questions about students, classes, contact details, bus routes, outstanding fees, and academic marks.\n"
        "You are strictly READ-ONLY. You cannot change, create, or delete any data. If asked to do so, politely explain that you do not have permission to modify data.\n"
        "Ground your answers ONLY in the school database context provided. If the context does not contain the answer, politely say so. Do not hallucinate or guess details.\n"
        "Present numbers, lists, and fee balances clearly using markdown."
    )
    
    # 3. Call Gemini using the new SDK syntax
    try:
        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        
        contents = f"User Question: {payload.message}\n\nLive School Database Context:\n{db_context}"
        
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.2
            )
        )
        return {"response": response.text}
    except Exception as e:
        return {
            "response": f"An error occurred while communicating with Gemini: {str(e)}\n\nDatabase Context retrieved:\n{db_context}"
        }
