import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Users, 
  Award, 
  Plus, 
  Edit, 
  X, 
  Check, 
  Loader 
} from 'lucide-react';
import Card from './ui/Card';
import StatCard from './ui/StatCard';
import Button from './ui/Button';
import DataTable from './ui/DataTable';
import '../styles/TeacherDashboard.css';

const TeacherDashboard = ({ currentView }) => {
  const { user, authenticatedFetch, API_URL } = useAuth();
  const [stats, setStats] = useState(null);
  const [students, setStudents] = useState([]);
  const [marks, setMarks] = useState([]);
  
  // Modals
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  
  // Marks entry state
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedExam, setSelectedExam] = useState('FA-1');
  const [selectedSubject, setSelectedSubject] = useState('Telugu');
  const [scoreInput, setScoreInput] = useState('');
  const [marksError, setMarksError] = useState(null);
  const [marksSuccess, setMarksSuccess] = useState(null);

  // Student form state (restricted to teacher's class_id)
  const [studentForm, setStudentForm] = useState({
    admission_number: '',
    name: '',
    photo_url: '',
    date_of_birth: '',
    gender: 'Male',
    father_name: '',
    mother_name: '',
    address: '',
    contact_number: '',
    emergency_contact: '',
    bus_number: '',
    bus_route: '',
    annual_fee: '50000', // default suggestion
    family_id: '',
    class_id: user?.class_id || '',
    status: 'active'
  });

  const fetchStats = async () => {
    try {
      const res = await authenticatedFetch(`${API_URL}/api/dashboard/teacher`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchStudents = async () => {
    try {
      const res = await authenticatedFetch(`${API_URL}/api/students`);
      if (res.ok) {
        const data = await res.json();
        setStudents(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMarks = async () => {
    try {
      const res = await authenticatedFetch(`${API_URL}/api/marks`);
      if (res.ok) {
        const data = await res.json();
        setMarks(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchStats();
    if (currentView === 'students') {
      fetchStudents();
    } else if (currentView === 'marks') {
      fetchStudents();
      fetchMarks();
    }
  }, [currentView]);

  const handleOpenAddModal = () => {
    setEditingStudent(null);
    setStudentForm({
      admission_number: '',
      name: '',
      photo_url: '',
      date_of_birth: '',
      gender: 'Male',
      father_name: '',
      mother_name: '',
      address: '',
      contact_number: '',
      emergency_contact: '',
      bus_number: '',
      bus_route: '',
      annual_fee: '50000',
      family_id: '',
      class_id: user?.class_id || '',
      status: 'active'
    });
    setShowFormModal(true);
  };

  const handleOpenEditModal = (student) => {
    setEditingStudent(student);
    setStudentForm({
      admission_number: student.admission_number,
      name: student.name,
      photo_url: student.photo_url || '',
      date_of_birth: student.date_of_birth,
      gender: student.gender,
      father_name: student.father_name,
      mother_name: student.mother_name,
      address: student.address,
      contact_number: student.contact_number,
      emergency_contact: student.emergency_contact,
      bus_number: student.bus_number || '',
      bus_route: student.bus_route || '',
      annual_fee: student.annual_fee.toString(),
      family_id: student.family_id,
      class_id: student.class_id,
      status: student.status
    });
    setShowFormModal(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editingStudent 
        ? `${API_URL}/api/students/${editingStudent.id}`
        : `${API_URL}/api/students/`;
      const method = editingStudent ? 'PUT' : 'POST';

      const bodyData = {
        ...studentForm,
        class_id: parseInt(user.class_id), // Enforce assigned class
        annual_fee: parseFloat(studentForm.annual_fee),
        bus_number: studentForm.bus_number || null,
        bus_route: studentForm.bus_route || null,
        photo_url: studentForm.photo_url || null
      };

      const res = await authenticatedFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData)
      });

      if (res.ok) {
        setShowFormModal(false);
        fetchStudents();
        fetchStats();
      } else {
        const errorData = await res.json();
        alert(errorData.detail || "Failed to save student record");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleEnterMarks = async (e) => {
    e.preventDefault();
    setMarksError(null);
    setMarksSuccess(null);
    if (!selectedStudent || scoreInput === '') return;

    try {
      // Check if mark already exists to decide POST or PUT
      const score = parseInt(scoreInput);
      if (score < 0 || score > 100) {
        setMarksError("Score must be between 0 and 100.");
        return;
      }

      const existingMark = marks.find(m => 
        m.student_id === selectedStudent && 
        m.exam_type === selectedExam && 
        m.subject === selectedSubject
      );

      let res;
      if (existingMark) {
        // Edit existing mark entry
        res = await authenticatedFetch(`${API_URL}/api/marks/${existingMark.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ marks_obtained: score })
        });
      } else {
        // Create new mark entry
        res = await authenticatedFetch(`${API_URL}/api/marks/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            student_id: selectedStudent,
            exam_type: selectedExam,
            subject: selectedSubject,
            marks_obtained: score
          })
        });
      }

      const data = await res.json();

      if (res.ok) {
        setMarksSuccess("Marks recorded successfully!");
        setScoreInput('');
        fetchMarks();
        fetchStats();
      } else {
        setMarksError(data.detail || "Failed to submit marks.");
      }
    } catch (err) {
      setMarksError("Failed to connect to API.");
    }
  };

  const handleSubmitExamForApproval = async (studentId, exam) => {
    try {
      const res = await authenticatedFetch(
        `${API_URL}/api/marks/submit?student_id=${studentId}&exam_type=${exam}`, 
        { method: 'POST' }
      );
      if (res.ok) {
        alert("Exam marks submitted to Admin for approval.");
        fetchMarks();
        fetchStats();
      } else {
        const d = await res.json();
        alert(d.detail || "Failed to submit exam marks.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (currentView === 'dashboard') {
    return (
      <div className="teacher-view">
        <div className="teacher-stats-grid stagger-reveal">
          <StatCard
            label="Assigned Class"
            value={stats?.class_name || 'N/A'}
            icon={<Users size={20} />}
            tone="info"
          />
          <StatCard
            label="Total Students"
            value={stats?.total_students || 0}
            icon={<Users size={20} />}
            tone="neutral"
          />
          <StatCard
            label="Active Roster"
            value={stats?.active_students || 0}
            icon={<Users size={20} />}
            tone="success"
          />
          <StatCard
            label="Pending Reviews"
            value={stats?.pending_marks_entries_count || 0}
            icon={<Award size={20} />}
            tone="warning"
          />
        </div>

        <div className="teacher-dashboard-grid">
          <Card elevated>
            <h3 className="text-section-title teacher-panel__title">Recent Marks Activity</h3>
            <DataTable
              columns={[
                { key: 'student_name', header: 'Student', render: (m) => <strong>{m.student_name}</strong> },
                { key: 'exam_type', header: 'Exam' },
                { key: 'subject', header: 'Subject' },
                { key: 'marks_obtained', header: 'Marks', render: (m) => `${m.marks_obtained} / 100` },
                {
                  key: 'status',
                  header: 'Status',
                  render: (m) => <span className={`teacher-status-badge teacher-status-badge--${m.status}`}>{m.status}</span>,
                },
              ]}
              data={stats?.recent_marks || []}
              rowKey="id"
              emptyMessage="No recent marks activity in this class."
            />
          </Card>

          <Card elevated>
            <h3 className="text-section-title teacher-panel__title">Grading Rules</h3>
            <div className="teacher-rules-list">
              <p>1. Marks are submitted as <strong>draft</strong> first.</p>
              <p>2. Teachers can edit draft records up to <strong>2 times</strong>. The third edit locks the record, requiring Admin intervention.</p>
              <p>3. Once draft marks are complete for a student's exam, submit them. The status changes to <strong>submitted</strong>.</p>
              <p>4. After the Admin approves the marks, parents can immediately view them on their portal.</p>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (currentView === 'students') {
    return (
      <div className="teacher-view">
        <Card elevated className="teacher-table-card">
          <div className="teacher-panel__header">
            <div>
              <h3 className="text-section-title teacher-panel__title">My Classroom Enrollment</h3>
              <span className="text-caption">Class list for: {stats?.class_name}</span>
            </div>
            <Button variant="primary" size="sm" onClick={handleOpenAddModal}>
              <Plus size={16} /> Add Student
            </Button>
          </div>

          <DataTable
            columns={[
              { key: 'student_id', header: 'Student ID', render: (s) => <strong className="teacher-id-cell">{s.student_id}</strong> },
              { key: 'admission_number', header: 'Admission No' },
              { key: 'name', header: 'Name' },
              { key: 'gender', header: 'Gender' },
              { key: 'father_name', header: "Father's Name" },
              { key: 'contact_number', header: 'Contact' },
              { key: 'family_id', header: 'Family ID' },
              {
                key: 'status',
                header: 'Status',
                render: (s) => <span className={`teacher-status-badge teacher-status-badge--${s.status}`}>{s.status}</span>,
              },
              {
                key: 'actions',
                header: 'Actions',
                align: 'center',
                render: (s) => (
                  <Button variant="outline" size="sm" onClick={() => handleOpenEditModal(s)} title="Edit">
                    <Edit size={14} />
                  </Button>
                ),
              },
            ]}
            data={students}
            rowKey="id"
            emptyMessage="No students enrolled in your class yet."
          />
        </Card>

        {/* PREVENT OVERLAPS: MODAL POPUP */}
        {showFormModal && (
          <div className="teacher-modal-overlay">
            <Card elevated className="teacher-modal-content">
              <button className="teacher-modal-close" onClick={() => setShowFormModal(false)}>
                <X size={20} />
              </button>
              <h3 className="teacher-modal-title">
                {editingStudent ? `Modify Class Student: ${editingStudent.student_id}` : 'Enroll New Student in My Class'}
              </h3>
              
              <form onSubmit={handleFormSubmit} className="teacher-form">
                <div className="teacher-form-row">
                  <div className="teacher-form-group">
                    <label className="login-form__label">Admission Number</label>
                    <input 
                      type="text" 
                      className="login-form__input" 
                      value={studentForm.admission_number}
                      onChange={(e) => setStudentForm({...studentForm, admission_number: e.target.value})}
                      required
                      disabled={editingStudent}
                    />
                  </div>
                  <div className="teacher-form-group">
                    <label className="login-form__label">Student Name</label>
                    <input 
                      type="text" 
                      className="login-form__input" 
                      value={studentForm.name}
                      onChange={(e) => setStudentForm({...studentForm, name: e.target.value})}
                      required
                    />
                  </div>
                </div>

                <div className="teacher-form-row">
                  <div className="teacher-form-group">
                    <label className="login-form__label">Date of Birth</label>
                    <input 
                      type="date" 
                      className="login-form__input" 
                      value={studentForm.date_of_birth}
                      onChange={(e) => setStudentForm({...studentForm, date_of_birth: e.target.value})}
                      required
                    />
                  </div>
                  <div className="teacher-form-group">
                    <label className="login-form__label">Gender</label>
                    <select 
                      className="login-form__input" 
                      value={studentForm.gender}
                      onChange={(e) => setStudentForm({...studentForm, gender: e.target.value})}
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="teacher-form-row">
                  <div className="teacher-form-group">
                    <label className="login-form__label">Father's Name</label>
                    <input 
                      type="text" 
                      className="login-form__input" 
                      value={studentForm.father_name}
                      onChange={(e) => setStudentForm({...studentForm, father_name: e.target.value})}
                      required
                    />
                  </div>
                  <div className="teacher-form-group">
                    <label className="login-form__label">Mother's Name</label>
                    <input 
                      type="text" 
                      className="login-form__input" 
                      value={studentForm.mother_name}
                      onChange={(e) => setStudentForm({...studentForm, mother_name: e.target.value})}
                      required
                    />
                  </div>
                </div>

                <div className="teacher-form-group">
                  <label className="login-form__label">Residential Address</label>
                  <input 
                    type="text" 
                    className="login-form__input" 
                    value={studentForm.address}
                    onChange={(e) => setStudentForm({...studentForm, address: e.target.value})}
                    required
                  />
                </div>

                <div className="teacher-form-row">
                  <div className="teacher-form-group">
                    <label className="login-form__label">Contact Number</label>
                    <input 
                      type="text" 
                      className="login-form__input" 
                      value={studentForm.contact_number}
                      onChange={(e) => setStudentForm({...studentForm, contact_number: e.target.value})}
                      required
                    />
                  </div>
                  <div className="teacher-form-group">
                    <label className="login-form__label">Emergency Contact</label>
                    <input 
                      type="text" 
                      className="login-form__input" 
                      value={studentForm.emergency_contact}
                      onChange={(e) => setStudentForm({...studentForm, emergency_contact: e.target.value})}
                      required
                    />
                  </div>
                </div>

                <div className="teacher-form-row">
                  <div className="teacher-form-group">
                    <label className="login-form__label">Bus Number (Optional)</label>
                    <input 
                      type="text" 
                      className="login-form__input" 
                      value={studentForm.bus_number}
                      onChange={(e) => setStudentForm({...studentForm, bus_number: e.target.value})}
                    />
                  </div>
                  <div className="teacher-form-group">
                    <label className="login-form__label">Bus Route (Optional)</label>
                    <input 
                      type="text" 
                      className="login-form__input" 
                      value={studentForm.bus_route}
                      onChange={(e) => setStudentForm({...studentForm, bus_route: e.target.value})}
                    />
                  </div>
                </div>

                <div className="teacher-form-row">
                  <div className="teacher-form-group">
                    <label className="login-form__label">Annual Tuition Fee (₹)</label>
                    <input 
                      type="number" 
                      className="login-form__input" 
                      value={studentForm.annual_fee}
                      onChange={(e) => setStudentForm({...studentForm, annual_fee: e.target.value})}
                      required
                    />
                  </div>
                  <div className="teacher-form-group">
                    <label className="login-form__label">Family ID</label>
                    <input 
                      type="text" 
                      className="login-form__input" 
                      value={studentForm.family_id}
                      onChange={(e) => setStudentForm({...studentForm, family_id: e.target.value})}
                      required
                    />
                  </div>
                </div>

                <div className="teacher-form-footer">
                  <Button type="button" variant="outline" onClick={() => setShowFormModal(false)}>Cancel</Button>
                  <Button type="submit" variant="primary">Enroll Student</Button>
                </div>
              </form>
            </Card>
          </div>
        )}
      </div>
    );
  }

  if (currentView === 'marks') {
    return (
      <div className="teacher-view">
        <div className="teacher-marks-grid">
          {/* Marks Entry Panel */}
          <Card elevated>
            <h3 className="text-section-title teacher-panel__title">Marks Entry Ledger</h3>
            
            <form onSubmit={handleEnterMarks} className="teacher-marks-form">
              {marksError && (
                <div className="teacher-form-banner teacher-form-banner--error">
                  {marksError}
                </div>
              )}
              {marksSuccess && (
                <div className="teacher-form-banner teacher-form-banner--success">
                  {marksSuccess}
                </div>
              )}

              <div className="teacher-form-group">
                <label className="login-form__label">Student</label>
                <select 
                  className="login-form__input" 
                  value={selectedStudent} 
                  onChange={(e) => {
                    setSelectedStudent(e.target.value);
                    setMarksError(null);
                    setMarksSuccess(null);
                  }}
                  required
                >
                  <option value="">-- Select Student --</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.student_id})</option>
                  ))}
                </select>
              </div>

              <div className="teacher-form-row">
                <div className="teacher-form-group">
                  <label className="login-form__label">Exam Type</label>
                  <select 
                    className="login-form__input" 
                    value={selectedExam} 
                    onChange={(e) => setSelectedExam(e.target.value)}
                  >
                    <option value="FA-1">FA-1</option>
                    <option value="FA-2">FA-2</option>
                    <option value="SA-1">SA-1</option>
                    <option value="FA-3">FA-3</option>
                    <option value="FA-4">FA-4</option>
                    <option value="SA-2">SA-2</option>
                  </select>
                </div>

                <div className="teacher-form-group">
                  <label className="login-form__label">Subject</label>
                  <select 
                    className="login-form__input" 
                    value={selectedSubject} 
                    onChange={(e) => setSelectedSubject(e.target.value)}
                  >
                    <option value="Telugu">Telugu</option>
                    <option value="Hindi">Hindi</option>
                    <option value="English">English</option>
                    <option value="Maths">Maths</option>
                    <option value="Science">Science</option>
                    <option value="Social">Social</option>
                  </select>
                </div>
              </div>

              <div className="teacher-form-group">
                <label className="login-form__label">Marks Obtained (out of 100)</label>
                <input 
                  type="number" 
                  className="login-form__input" 
                  min="0" 
                  max="100" 
                  placeholder="Enter score"
                  value={scoreInput}
                  onChange={(e) => setScoreInput(e.target.value)}
                  required
                />
              </div>

              <Button type="submit" variant="primary" fullWidth>
                Save Score
              </Button>
            </form>
          </Card>

          {/* Existing Marks in Class */}
          <Card elevated>
            <h3 className="text-section-title teacher-panel__title">Saved Marks Sheets</h3>
            
            <div className="teacher-marks-sheets">
              {students.map(s => {
                const studentMarks = marks.filter(m => m.student_id === s.id);
                if (studentMarks.length === 0) return null;
                
                // Group marks by exam type
                const examsList = ['FA-1', 'FA-2', 'SA-1', 'FA-3', 'FA-4', 'SA-2'];
                
                return (
                  <div key={s.id} className="teacher-marks-sheet">
                    <div className="teacher-marks-sheet__header">
                      <strong className="teacher-marks-sheet__name">{s.name}</strong>
                      <span className="text-caption">{s.student_id}</span>
                    </div>
                    
                    {examsList.map(ex => {
                      const examMarks = studentMarks.filter(m => m.exam_type === ex);
                      if (examMarks.length === 0) return null;
                      
                      const isAllDraft = examMarks.every(m => m.status === 'draft');
                      
                      return (
                        <div key={ex} className="teacher-exam-block">
                          <div className="teacher-exam-block__header">
                            <span className="teacher-exam-block__label">{ex} Marks</span>
                            {isAllDraft && (
                              <Button 
                                variant="outline"
                                size="sm"
                                onClick={() => handleSubmitExamForApproval(s.id, ex)}
                              >
                                Submit {ex}
                              </Button>
                            )}
                          </div>
                          
                          <div className="teacher-exam-block__scores">
                            {examMarks.map(em => (
                              <div key={em.id} className="teacher-score-tile">
                                <div className="text-caption">{em.subject}</div>
                                <div className="teacher-score-tile__value">{em.marks_obtained}</div>
                                <div className="teacher-score-tile__meta">
                                  {em.status} ({em.edit_count}/2)
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return null;
};

export default TeacherDashboard;