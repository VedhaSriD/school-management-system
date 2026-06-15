import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.core.database import Base, get_db
from app.core.security import get_password_hash
from app.models import models

# Use a test SQLite database
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_school.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="module")
def db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    
    # Seed mock data for tests
    # Classes
    cls1 = models.Class(id=1, name="LKG", class_group="Nursery/KG")
    cls2 = models.Class(id=2, name="Class 1", class_group="Primary")
    session.add_all([cls1, cls2])
    session.flush()
    
    # Users
    admin = models.User(
        username="admin_test", password_hash=get_password_hash("test"),
        role="Admin", full_name="Admin Test", is_active=True
    )
    teacher = models.User(
        username="teacher_test", password_hash=get_password_hash("test"),
        role="Teacher", full_name="Teacher Test", is_active=True
    )
    recep = models.User(
        username="recep_test", password_hash=get_password_hash("test"),
        role="Receptionist", full_name="Recep Test", is_active=True
    )
    parent = models.User(
        username="parent_test", password_hash=get_password_hash("test"),
        role="Parent", full_name="Parent Test", is_active=True
    )
    session.add_all([admin, teacher, recep, parent])
    session.flush()
    
    # Teacher Profile: Assigned to Class 1 (LKG)
    t_profile = models.Teacher(user_id=teacher.id, assigned_class_id=1)
    session.add(t_profile)
    
    # Parent Profile: linked to Family FAM-111
    p_profile = models.ParentAccess(parent_user_id=parent.id, family_id="FAM-111")
    session.add(p_profile)
    session.flush()
    
    # Students
    # Student 1 in LKG (teacher's assigned class)
    s1 = models.Student(
        id="s1-uuid", student_id="VIS20261111", admission_number="ADM1111",
        name="Student One", date_of_birth=models.date(2020, 1, 1), gender="Male",
        father_name="Father One", mother_name="Mother One", address="Address One",
        contact_number="9999999991", emergency_contact="9999999992", annual_fee=50000.0,
        family_id="FAM-111", class_id=1, status="active"
    )
    # Student 2 in Class 2 (another class)
    s2 = models.Student(
        id="s2-uuid", student_id="VIS20262222", admission_number="ADM2222",
        name="Student Two", date_of_birth=models.date(2018, 1, 1), gender="Female",
        father_name="Father Two", mother_name="Mother Two", address="Address Two",
        contact_number="9999999993", emergency_contact="9999999994", annual_fee=60000.0,
        family_id="FAM-222", class_id=2, status="active"
    )
    session.add_all([s1, s2])
    
    session.commit()
    yield session
    session.close()
    Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="module")
def client(db):
    def override_get_db():
        try:
            yield db
        finally:
            pass
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()

def get_token(client, username, password):
    res = client.post("/api/auth/login", data={"username": username, "password": password})
    assert res.status_code == 200
    return res.json()["access_token"]

def test_login(client):
    res = client.post("/api/auth/login", data={"username": "admin_test", "password": "test"})
    assert res.status_code == 200
    assert "access_token" in res.json()
    assert res.json()["role"] == "Admin"

def test_teacher_classroom_restriction(client):
    teacher_token = get_token(client, "teacher_test", "test")
    headers = {"Authorization": f"Bearer {teacher_token}"}
    
    # 1. Fetching students should only return Student One (LKG)
    res = client.get("/api/students", headers=headers)
    assert res.status_code == 200
    student_names = [s["name"] for s in res.json()]
    assert "Student One" in student_names
    assert "Student Two" not in student_names
    
    # 2. Querying Student Two directly should raise 403 Forbidden
    res = client.get("/api/students/s2-uuid", headers=headers)
    assert res.status_code == 403

def test_parent_family_restriction(client):
    parent_token = get_token(client, "parent_test", "test")
    headers = {"Authorization": f"Bearer {parent_token}"}
    
    # 1. Parents should only see family students (Student One)
    res = client.get("/api/students", headers=headers)
    assert res.status_code == 200
    student_ids = [s["id"] for s in res.json()]
    assert "s1-uuid" in student_ids
    assert "s2-uuid" not in student_ids
    
    # 2. Querying Student Two directly should raise 403
    res = client.get("/api/students/s2-uuid", headers=headers)
    assert res.status_code == 403

def test_marks_locking_rule(client):
    teacher_token = get_token(client, "teacher_test", "test")
    headers = {"Authorization": f"Bearer {teacher_token}"}
    
    # 1. Enter a mark (initially draft, edit_count = 0)
    res = client.post("/api/marks/", headers=headers, json={
        "student_id": "s1-uuid",
        "exam_type": "FA-1",
        "subject": "Telugu",
        "marks_obtained": 80
    })
    assert res.status_code == 200
    mark_id = res.json()["id"]
    assert res.json()["edit_count"] == 0
    
    # 2. First edit (edit_count -> 1)
    res = client.put(f"/api/marks/{mark_id}", headers=headers, json={"marks_obtained": 85})
    assert res.status_code == 200
    assert res.json()["edit_count"] == 1
    
    # 3. Second edit (edit_count -> 2)
    res = client.put(f"/api/marks/{mark_id}", headers=headers, json={"marks_obtained": 90})
    assert res.status_code == 200
    assert res.json()["edit_count"] == 2
    
    # 4. Third edit should be BLOCKED (status code 400, edit lock active)
    res = client.put(f"/api/marks/{mark_id}", headers=headers, json={"marks_obtained": 95})
    assert res.status_code == 400
    assert "locked" in res.json()["detail"].lower()

def test_student_deletion_restrictions(client):
    # Teachers cannot delete students
    teacher_token = get_token(client, "teacher_test", "test")
    res = client.delete("/api/students/s1-uuid", headers={"Authorization": f"Bearer {teacher_token}"})
    assert res.status_code == 403
    
    # Admin can delete students
    admin_token = get_token(client, "admin_test", "test")
    res = client.delete("/api/students/s1-uuid", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 204
