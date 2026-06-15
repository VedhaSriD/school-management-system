from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.core.config import settings
from app.dependencies.auth import get_current_active_user
from app.models import models
from io import BytesIO
from decimal import Decimal
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.pdfgen import canvas

router = APIRouter(prefix="/pdf", tags=["pdf"])

def draw_header(c, title):
    # Top border / accent line
    c.setStrokeColor(colors.HexColor('#1E293B'))
    c.setLineWidth(4)
    c.line(40, 750, 570, 750)
    
    # Branded Header
    c.setFillColor(colors.HexColor('#1E293B'))
    c.setFont("Helvetica-Bold", 20)
    c.drawString(40, 765, "VEDHA INTERNATIONAL SCHOOL")
    
    c.setFont("Helvetica", 10)
    c.setFillColor(colors.HexColor('#64748B'))
    c.drawString(40, 752, "Building Leaders for Tomorrow | Cloud-Based School ERP")
    
    c.setFont("Helvetica-Bold", 14)
    c.setFillColor(colors.HexColor('#0F172A'))
    c.drawRightString(570, 765, title.upper())

def draw_footer(c, page_num=1):
    c.setStrokeColor(colors.HexColor('#E2E8F0'))
    c.setLineWidth(1)
    c.line(40, 50, 570, 50)
    
    c.setFont("Helvetica", 8)
    c.setFillColor(colors.HexColor('#94A3B8'))
    c.drawString(40, 35, "This is an officially generated system document of Vedha International School.")
    c.drawRightString(570, 35, f"Page {page_num}")

@router.get("/receipt/{payment_id}")
def generate_receipt_pdf(
    payment_id: str,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    payment = db.query(models.Payment).filter(models.Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment record not found")
        
    student = payment.student
    
    # Enforce Parent / Teacher viewing constraints
    if current_user.role == "Teacher":
        teacher_profile = current_user.teacher_profile
        if not teacher_profile or student.class_id != teacher_profile.assigned_class_id:
            raise HTTPException(status_code=403, detail="Access denied.")
    elif current_user.role == "Parent":
        parent_profile = current_user.parent_profile
        if not parent_profile or student.family_id != parent_profile.family_id:
            raise HTTPException(status_code=403, detail="Access denied.")
            
    # Calculate balance
    payments_sum = db.query(func.sum(models.Payment.amount_paid)).filter(
        models.Payment.student_id == student.id,
        models.Payment.created_at <= payment.created_at
    ).scalar() or Decimal('0.00')
    
    total_paid_to_date = Decimal(str(payments_sum))
    pending_fee = student.annual_fee - total_paid_to_date
    
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=letter)
    
    draw_header(c, "FEE RECEIPT")
    
    # Receipt Details Box
    c.setStrokeColor(colors.HexColor('#CBD5E1'))
    c.setFillColor(colors.HexColor('#F8FAFC'))
    c.rect(40, 600, 530, 110, fill=True, stroke=True)
    
    c.setFillColor(colors.HexColor('#0F172A'))
    c.setFont("Helvetica-Bold", 11)
    c.drawString(55, 685, f"Receipt Number: {payment.receipt_number}")
    c.drawString(55, 665, f"Date: {payment.payment_date.strftime('%B %d, %Y')}")
    c.drawString(55, 645, f"Payment Method: {payment.payment_method}")
    
    c.drawRightString(550, 685, f"Admission No: {student.admission_number}")
    c.drawRightString(550, 665, f"Student ID: {student.student_id}")
    c.drawRightString(550, 645, f"Class: {student.student_class.name if student.student_class else 'N/A'}")
    
    # Student Details
    c.setFont("Helvetica-Bold", 12)
    c.drawString(40, 560, "Student & Guardian Details")
    c.setFont("Helvetica", 10)
    c.drawString(40, 540, f"Student Name: {student.name}")
    c.drawString(40, 520, f"Father's Name: {student.father_name}")
    c.drawString(40, 500, f"Contact Number: {student.contact_number}")
    
    c.drawRightString(570, 540, f"Family ID: {student.family_id}")
    c.drawRightString(570, 520, f"Mother's Name: {student.mother_name}")
    
    # Fee Calculation Table
    c.setFillColor(colors.HexColor('#1E293B'))
    c.rect(40, 420, 530, 25, fill=True, stroke=False)
    
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(50, 428, "Description")
    c.drawRightString(560, 428, "Amount (INR)")
    
    c.setFillColor(colors.HexColor('#0F172A'))
    c.setFont("Helvetica", 10)
    c.drawString(50, 395, "Annual School Fee Tuition & General Dues")
    c.drawRightString(560, 395, f"{student.annual_fee:.2f}")
    
    c.drawString(50, 370, "Total Amount Paid to Date (Cumulative)")
    c.drawRightString(560, 370, f"- {total_paid_to_date:.2f}")
    
    # Dividers
    c.setStrokeColor(colors.HexColor('#E2E8F0'))
    c.line(40, 350, 570, 350)
    
    # Current Payment Highlight
    c.setFont("Helvetica-Bold", 11)
    c.drawString(50, 325, "AMOUNT PAID THIS TRANSACTION")
    c.drawRightString(560, 325, f"{payment.amount_paid:.2f}")
    
    c.setFont("Helvetica-Bold", 11)
    c.setFillColor(colors.HexColor('#DC2626') if pending_fee > 0 else colors.HexColor('#16A34A'))
    c.drawString(50, 300, "OUTSTANDING BALANCE DUE")
    c.drawRightString(560, 300, f"{pending_fee:.2f}")
    
    # Signature fields
    c.setFillColor(colors.HexColor('#0F172A'))
    c.setFont("Helvetica", 9)
    c.drawString(40, 180, "_________________________")
    c.drawString(40, 165, "Receptionist / Accountant Signature")
    
    c.drawRightString(570, 180, "_________________________")
    c.drawRightString(570, 165, "Authorized School Stamp")
    
    draw_footer(c)
    
    c.showPage()
    c.save()
    
    buffer.seek(0)
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=receipt_{payment.receipt_number}.pdf"}
    )

@router.get("/report-card/{student_id}")
def generate_report_card_pdf(
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
            raise HTTPException(status_code=403, detail="Access denied.")
    elif current_user.role == "Parent":
        parent_profile = current_user.parent_profile
        if not parent_profile or student.family_id != parent_profile.family_id:
            raise HTTPException(status_code=403, detail="Access denied.")
            
    # Fetch approved marks
    marks = db.query(models.Mark).filter(
        models.Mark.student_id == student.id,
        models.Mark.status == "approved"
    ).all()
    
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=letter)
    
    draw_header(c, "REPORT CARD")
    
    # Student Info details
    c.setStrokeColor(colors.HexColor('#CBD5E1'))
    c.rect(40, 630, 530, 80, fill=False, stroke=True)
    
    c.setFillColor(colors.HexColor('#0F172A'))
    c.setFont("Helvetica-Bold", 10)
    c.drawString(55, 690, f"Student Name: {student.name}")
    c.drawString(55, 670, f"Student ID: {student.student_id}")
    c.drawString(55, 650, f"Date of Birth: {student.date_of_birth.strftime('%d-%m-%Y')}")
    
    c.drawRightString(550, 690, f"Class: {student.student_class.name if student.student_class else 'N/A'}")
    c.drawRightString(550, 670, f"Admission No: {student.admission_number}")
    c.drawRightString(550, 650, f"Father's Name: {student.father_name}")
    
    # Grading structure setup
    # Table headers
    c.setFillColor(colors.HexColor('#1E293B'))
    c.rect(40, 570, 530, 25, fill=True, stroke=False)
    
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(45, 578, "Subject")
    
    exams = settings.EXAMS
    col_width = 65
    for idx, ex in enumerate(exams):
        c.drawString(160 + idx * col_width, 578, ex)
    c.drawString(160 + len(exams) * col_width, 578, "Average")
    
    # Grid lines & content mapping
    y = 540
    subjects = settings.SUBJECTS
    
    # Build a lookup map: (subject, exam_type) -> marks_obtained
    marks_map = {}
    for m in marks:
        marks_map[(m.subject, m.exam_type)] = m.marks_obtained
        
    c.setFillColor(colors.HexColor('#0F172A'))
    total_marks_sum = 0
    total_marks_count = 0
    
    for sub in subjects:
        c.setFont("Helvetica-Bold", 9)
        c.drawString(45, y + 3, sub)
        c.setFont("Helvetica", 9)
        
        sub_total = 0
        sub_count = 0
        for idx, ex in enumerate(exams):
            val = marks_map.get((sub, ex))
            if val is not None:
                c.drawString(160 + idx * col_width, y + 3, str(val))
                sub_total += val
                sub_count += 1
                total_marks_sum += val
                total_marks_count += 1
            else:
                c.drawString(160 + idx * col_width, y + 3, "-")
                
        # Subject Average
        if sub_count > 0:
            sub_avg = sub_total / sub_count
            c.drawString(160 + len(exams) * col_width, y + 3, f"{sub_avg:.1f}")
        else:
            c.drawString(160 + len(exams) * col_width, y + 3, "-")
            
        c.setStrokeColor(colors.HexColor('#E2E8F0'))
        c.line(40, y - 5, 570, y - 5)
        y -= 25
        
    # Total Average Summary
    y -= 10
    c.setFont("Helvetica-Bold", 10)
    c.drawString(45, y, "Academic Performance Summary:")
    if total_marks_count > 0:
        overall_avg = total_marks_sum / total_marks_count
        c.drawRightString(570, y, f"Overall Percentage: {overall_avg:.2f}%")
        
        # Grade mapping
        if overall_avg >= 90: grade = "A+ (Outstanding)"
        elif overall_avg >= 80: grade = "A (Excellent)"
        elif overall_avg >= 70: grade = "B (Very Good)"
        elif overall_avg >= 60: grade = "C (Good)"
        elif overall_avg >= 50: grade = "D (Satisfactory)"
        else: grade = "F (Needs Improvement)"
        
        c.drawRightString(570, y - 20, f"Final Grade: {grade}")
    else:
        c.drawRightString(570, y, "Overall Percentage: No Approved Marks")
        
    # Signatures
    c.drawString(40, 180, "_________________________")
    c.drawString(40, 165, "Class Teacher's Signature")
    
    c.drawRightString(570, 180, "_________________________")
    c.drawRightString(570, 165, "Principal Signature")
    
    draw_footer(c)
    c.showPage()
    c.save()
    
    buffer.seek(0)
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=report_{student.student_id}.pdf"}
    )

@router.get("/hall-ticket/{student_id}")
def generate_hall_ticket_pdf(
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
            raise HTTPException(status_code=403, detail="Access denied.")
    elif current_user.role == "Parent":
        parent_profile = current_user.parent_profile
        if not parent_profile or student.family_id != parent_profile.family_id:
            raise HTTPException(status_code=403, detail="Access denied.")
            
    # Hall ticket permission check
    if not student.hall_ticket_approved:
        raise HTTPException(
            status_code=400,
            detail="Hall Ticket is not approved. Outstanding fees must be fully settled."
        )
        
    # Configure class specific details
    class_name = student.student_class.name if student.student_class else "Unknown"
    class_config = settings.CLASSES_MAP.get(class_name, {"has_subjects": True, "group": "Primary"})
    has_subjects = class_config.get("has_subjects", True)
    
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=letter)
    
    draw_header(c, "EXAMINATION HALL TICKET")
    
    # Large class designation box
    c.setStrokeColor(colors.HexColor('#1E293B'))
    c.setFillColor(colors.HexColor('#F1F5F9'))
    c.rect(40, 610, 530, 95, fill=True, stroke=True)
    
    c.setFillColor(colors.HexColor('#0F172A'))
    c.setFont("Helvetica-Bold", 12)
    c.drawString(55, 680, f"Student Name: {student.name}")
    c.drawString(55, 660, f"Student ID: {student.student_id}")
    c.drawString(55, 640, f"Admission No: {student.admission_number}")
    
    # Prominently display class number / designation
    c.drawRightString(550, 680, f"CLASS: {class_name.upper()}")
    c.drawRightString(550, 660, f"Group: {class_config.get('group', 'Primary')}")
    c.drawRightString(550, 640, f"Status: ACTIVE - FEES PAID")
    
    # Exam Instruction block
    c.setFont("Helvetica-Bold", 11)
    c.drawString(40, 570, "INSTRUCTIONS TO CANDIDATE")
    c.setFont("Helvetica", 9)
    c.drawString(40, 550, "1. Candidates must carry this Hall Ticket and present it upon request in the exam hall.")
    c.drawString(40, 535, "2. Candidates must be present in the exam hall 15 minutes before the exam commencement.")
    c.drawString(40, 520, "3. No electronic gadgets (mobile phones, smartwatches) are allowed inside the examination hall.")
    
    # Conditional subjects rendering based on grouping config
    if has_subjects:
        c.setFont("Helvetica-Bold", 11)
        c.drawString(40, 470, "SCHEDULED PAPERS & SUBJECTS")
        
        c.setFillColor(colors.HexColor('#1E293B'))
        c.rect(40, 435, 530, 20, fill=True, stroke=False)
        
        c.setFillColor(colors.white)
        c.setFont("Helvetica-Bold", 9)
        c.drawString(50, 442, "Subject Name")
        c.drawString(250, 442, "Exam Duration")
        c.drawRightString(550, 442, "Session")
        
        c.setFillColor(colors.HexColor('#0F172A'))
        c.setFont("Helvetica", 9)
        
        y = 415
        for sub in settings.SUBJECTS:
            c.drawString(50, y, sub)
            c.drawString(250, y, "2 Hours 30 Minutes")
            c.drawRightString(550, y, "Morning Session (9:30 AM)")
            c.setStrokeColor(colors.HexColor('#F1F5F9'))
            c.line(40, y - 5, 570, y - 5)
            y -= 20
    else:
        # Nursery / LKG / UKG - no subjects list, show custom notice
        c.setStrokeColor(colors.HexColor('#E2E8F0'))
        c.setFillColor(colors.HexColor('#FFFBEB'))
        c.rect(40, 360, 530, 100, fill=True, stroke=True)
        
        c.setFillColor(colors.HexColor('#D97706'))
        c.setFont("Helvetica-Bold", 12)
        c.drawString(55, 435, "Primary Assessment Notice (Nursery/LKG/UKG)")
        
        c.setFillColor(colors.HexColor('#1E293B'))
        c.setFont("Helvetica", 10)
        c.drawString(55, 410, "For kindergarten classes, assessment schedules are shared directly by the class teacher.")
        c.drawString(55, 395, "Daily oral evaluations, activities, and color/drawing evaluations will take place during regular")
        c.drawString(55, 380, "school hours. Regular attendance is requested during assessment periods.")

    # Signatures
    c.setFillColor(colors.HexColor('#0F172A'))
    c.setFont("Helvetica", 9)
    c.drawString(40, 180, "_________________________")
    c.drawString(40, 165, "Controller of Examinations")
    
    c.drawRightString(570, 180, "_________________________")
    c.drawRightString(570, 165, "Principal Signature")
    
    draw_footer(c)
    c.showPage()
    c.save()
    
    buffer.seek(0)
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=hallticket_{student.student_id}.pdf"}
    )
