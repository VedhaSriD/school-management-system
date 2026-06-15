import sys
import os
import random
from datetime import date, datetime, timedelta
from decimal import Decimal

# Add current directory to path so we can import from app
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database import SessionLocal, Base, engine
from app.core.security import get_password_hash
from app.models import models
from app.core.config import settings

# Sample names
FIRST_NAMES_BOY = ["Aarav", "Vihaan", "Aditya", "Sai", "Pranav", "Krishna", "Karthik", "Rohan", "Rahul", "Vikram", "Charan", "Nikhil", "Teja", "Harsha", "Manish"]
FIRST_NAMES_GIRL = ["Aanya", "Diya", "Sanya", "Kavya", "Anjali", "Pooja", "Meera", "Neha", "Divya", "Sruthi", "Sneha", "Keerthi", "Lavanya", "Ramya", "Preethi"]
LAST_NAMES = ["Kumar", "Reddy", "Rao", "Sharma", "Varma", "Chowdhury", "Patel", "Singh", "Joshi", "Naidu", "Goud", "Prasad"]

MALE_FATHER_NAMES = ["Anil", "Srinivas", "Ramesh", "Venkatesh", "Madhava", "Rajesh", "Sanjay", "Vijay", "Murthy", "Ravi"]
FEMALE_MOTHER_NAMES = ["Lalitha", "Sujatha", "Radha", "Lakshmi", "Sarada", "Padma", "Geetha", "Sunitha", "Kalyani", "Uma"]

BUS_ROUTES = ["Kukatpally Route", "Miyapur Line", "Gachibowli Express", "Secunderabad Loop", "LB Nagar route", "Jubilee Hills Direct"]

def seed_db():
    print("Starting seeding process...")
    db = SessionLocal()
    
    # 1. Clear database tables
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    print("Tables re-created.")

    # 2. Insert Classes based on Config
    classes_db = {}
    for name, info in settings.CLASSES_MAP.items():
        cls = models.Class(name=name, class_group=info["group"])
        db.add(cls)
        db.flush() # gets id
        classes_db[name] = cls
    print(f"Seeded {len(classes_db)} classes.")

    # 3. Create Default Users
    # Admin
    admin_user = models.User(
        username="admin",
        password_hash=get_password_hash("admin123"),
        role="Admin",
        full_name="Dhangar(Chairman)",
        email="admin@vedhaschool.edu.in",
        is_active=True
    )
    db.add(admin_user)
    
    # Receptionist
    recep_user = models.User(
        username="receptionist",
        password_hash=get_password_hash("recep123"),
        role="Receptionist",
        full_name="(Accountant)",
        email="billing@vedhaschool.edu.in",
        is_active=True
    )
    db.add(recep_user)

      # Teachers
    teacher_users = []

    teacher_data = [
        ("teacher1", "Nursery Teacher", "teacher1@vedhaschool.edu.in", "Nursery"),
        ("teacher2", "LKG Teacher", "teacher2@vedhaschool.edu.in", "LKG"),
        ("teacher3", "UKG Teacher", "teacher3@vedhaschool.edu.in", "UKG"),
        ("teacher4", "Class 1 Teacher", "teacher4@vedhaschool.edu.in", "Class 1"),
        ("teacher5", "Class 2 Teacher", "teacher5@vedhaschool.edu.in", "Class 2"),
        ("teacher6", "Class 3 Teacher", "teacher6@vedhaschool.edu.in", "Class 3"),
        ("teacher7", "Class 4 Teacher", "teacher7@vedhaschool.edu.in", "Class 4"),
        ("teacher8", "Class 5 Teacher", "teacher8@vedhaschool.edu.in", "Class 5"),
        ("teacher9", "Class 6 Teacher", "teacher9@vedhaschool.edu.in", "Class 6"),
        ("teacher10", "Class 7 Teacher", "teacher10@vedhaschool.edu.in", "Class 7"),
        ("teacher11", "Class 8 Teacher", "teacher11@vedhaschool.edu.in", "Class 8"),
        ("teacher12", "Class 9 Teacher", "teacher12@vedhaschool.edu.in", "Class 9"),
        ("teacher13", "Class 10 Teacher", "teacher13@vedhaschool.edu.in", "Class 10"),
    ]

    for username, fullname, email, class_name in teacher_data:
        teacher_user = models.User(
            username=username,
            password_hash=get_password_hash("teacher123"),
            role="Teacher",
            full_name=fullname,
            email=email,
            is_active=True
        )

        db.add(teacher_user)
        db.flush()

        teacher_profile = models.Teacher(
            user_id=teacher_user.id,
            assigned_class_id=classes_db[class_name].id
        )

        db.add(teacher_profile)
        teacher_users.append(teacher_user)
    
    # Parent (Family FAM-9081)
    parent_user = models.User(
        username="parent1",
        password_hash=get_password_hash("parent123"),
        role="Parent",
        full_name="(Parent1)",
        email="ravi.kumar@gmail.com",
        is_active=True
    )
    db.add(parent_user)
    db.flush()
    parent_profile = models.ParentAccess(parent_user_id=parent_user.id, family_id="FAM-9081")
    db.add(parent_profile)

    print("Seeded standard users (Admin, Receptionist, Teachers, Parent).")

    # 4. Seed 5 Students per Class (13 classes * 5 = 65 students)
    student_counter = 1
    year = datetime.now().year
    
    all_seeded_students = []
    
    # Keep track of family_ids to link sibling students
    sibling_family_id = "FAM-9081" # assigned to parent1
    
    for cls_name, cls_obj in classes_db.items():
        for i in range(1, 6):
            is_boy = random.choice([True, False])
            first_name = random.choice(FIRST_NAMES_BOY if is_boy else FIRST_NAMES_GIRL)
            last_name = random.choice(LAST_NAMES)
            student_name = f"{first_name} {last_name}"
            
            # Setup age based on class
            if "Nursery" in cls_name or "LKG" in cls_name or "UKG" in cls_name:
                age_offset = 3 + (0 if "Nursery" in cls_name else 1 if "LKG" in cls_name else 2)
            else:
                # Class 1 -> 6 years old, Class 10 -> 15 years old
                class_num = int(cls_name.split()[-1])
                age_offset = 5 + class_num
                
            dob = date.today() - timedelta(days=int(age_offset * 365.25 + random.randint(0, 180)))
            
            # Custom annual fee depending on class with small random variation
            base_fee = 35000 if cls_obj.class_group == "Nursery/KG" else 55000 if cls_obj.class_group == "Primary" else 65000
            custom_fee = Decimal(str(base_fee + random.randint(-5, 5) * 1000))
            
            # Generate family ID. Link 2 students to the sibling family ID for testing parent view.
            if cls_name == "LKG" and i == 1:
                family_id = sibling_family_id
                father_name = "Ravi Kumar"
                mother_name = "Sunitha Kumar"
                contact = "9876543210"
            elif cls_name == "Class 1" and i == 1:
                family_id = sibling_family_id
                father_name = "Ravi Kumar"
                mother_name = "Sunitha Kumar"
                contact = "9876543210"
            else:
                family_id = f"FAM-{random.randint(1000, 9999)}"
                father_name = f"{random.choice(MALE_FATHER_NAMES)} {last_name}"
                mother_name = f"{random.choice(FEMALE_MOTHER_NAMES)} {last_name}"
                contact = f"98{random.randint(10000000, 99999999)}"
                
            gender = "Male" if is_boy else "Female"
            
            # Bus details (roughly 60% of students use school bus)
            has_bus = random.choice([True, False, True])
            bus_no = str(random.randint(1, 12)) if has_bus else None
            bus_route = random.choice(BUS_ROUTES) if has_bus else None
            
            student = models.Student(
                student_id=f"VIS{year}{student_counter:04d}",
                admission_number=f"ADM{year}{student_counter:04d}",
                name=student_name,
                photo_url=f"https://api.dicebear.com/7.x/adventurer/svg?seed={first_name}",
                date_of_birth=dob,
                gender=gender,
                father_name=father_name,
                mother_name=mother_name,
                address=f"H.No {random.randint(1,200)}, Street {random.randint(1,10)}, Road No 4, Hyderabad, Telangana",
                contact_number=contact,
                emergency_contact=f"90{random.randint(10000000, 99999999)}",
                bus_number=bus_no,
                bus_route=bus_route,
                annual_fee=custom_fee,
                family_id=family_id,
                class_id=cls_obj.id,
                status="active"
            )
            
            db.add(student)
            db.flush()
            all_seeded_students.append(student)
            student_counter += 1
            
    print(f"Seeded {len(all_seeded_students)} students (5 per class).")
    
    # 5. Seed Payments & Fees Statuses
    # We want a mix: some paid 100% (hall ticket approvable), some partially, some unpaid.
    payments_count = 0
    for idx, student in enumerate(all_seeded_students):
        # We make our linked siblings have paid fees to test parent view and hall tickets
        if student.family_id == sibling_family_id:
            # 100% paid
            pay = models.Payment(
                student_id=student.id,
                amount_paid=student.annual_fee,
                payment_date=date.today() - timedelta(days=20),
                payment_method="Online",
                receipt_number=f"REC-{year}-{payments_count+1:05d}"
            )
            db.add(pay)
            student.hall_ticket_approved = True
            payments_count += 1
            continue
            
        # Others random
        fee_tier = idx % 4
        if fee_tier == 0:
            # Fully paid
            pay = models.Payment(
                student_id=student.id,
                amount_paid=student.annual_fee,
                payment_date=date.today() - timedelta(days=15),
                payment_method="Cash",
                receipt_number=f"REC-{year}-{payments_count+1:05d}"
            )
            db.add(pay)
            # 50% chance of approved hall ticket
            student.hall_ticket_approved = random.choice([True, False])
            payments_count += 1
        elif fee_tier == 1:
            # Partially Paid
            half_fee = Decimal(str(student.annual_fee)) / 2
            pay = models.Payment(
                student_id=student.id,
                amount_paid=half_fee,
                payment_date=date.today() - timedelta(days=30),
                payment_method="Card",
                receipt_number=f"REC-{year}-{payments_count+1:05d}"
            )
            db.add(pay)
            payments_count += 1
        elif fee_tier == 2:
            # Double payments
            part1 = Decimal("15000.00")
            part2 = Decimal("10000.00")
            pay1 = models.Payment(
                student_id=student.id,
                amount_paid=part1,
                payment_date=date.today() - timedelta(days=45),
                payment_method="Online",
                receipt_number=f"REC-{year}-{payments_count+1:05d}"
            )
            db.add(pay1)
            payments_count += 1
            
            pay2 = models.Payment(
                student_id=student.id,
                amount_paid=part2,
                payment_date=date.today() - timedelta(days=10),
                payment_method="Cash",
                receipt_number=f"REC-{year}-{payments_count+1:05d}"
            )
            db.add(pay2)
            payments_count += 1
        else:
            # Unpaid
            pass
            
    print(f"Seeded fee payments. Total payment transaction count: {payments_count}.")

    # 6. Seed Academic Marks
    # Let's seed marks for LKG and Class 1, to test marks workflows
    subjects = settings.SUBJECTS
    exams = ["FA-1", "FA-2", "SA-1"]
    
    marks_count = 0
    
    # Filter class 1 and LKG students
    class1_students = [s for s in all_seeded_students if s.student_class.name == "Class 1"]
    lkg_students = [s for s in all_seeded_students if s.student_class.name == "LKG"]
    
    test_students = class1_students + lkg_students
    
    for student in test_students:
        for exam in exams:
            # Determine status
            # Some approved, some submitted, some draft
            status_rand = random.choice(["approved", "approved", "submitted", "draft"])
            
            for sub in subjects:
                # If LKG (has_subjects is false in config, but let's seed marks for them anyway so we can see reports,
                # though hall tickets won't show it).
                
                marks_obtained = random.randint(65, 98)
                
                # Check who entered it
                # Use first teacher as default marker creator
                t_id = teacher_users[0].id
                
                mark = models.Mark(
                    student_id=student.id,
                    exam_type=exam,
                    subject=sub,
                    marks_obtained=marks_obtained,
                    max_marks=100,
                    teacher_id=t_id,
                    status=status_rand,
                    edit_count=0 if status_rand != "submitted" else 1
                )
                db.add(mark)
                marks_count += 1
                
    print(f"Seeded academic marks. Total marks entry count: {marks_count}.")
    
    db.commit()
    db.close()
    print("Database seeding completed successfully!")

if __name__ == "__main__":
    seed_db()
