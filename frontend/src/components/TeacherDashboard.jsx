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
      <div>
        <div className="stats-grid">
          <div className="stat-card glass-panel accent-cyan">
            <div className="stat-info">
              <span className="stat-label">Assigned Class</span>
              <span className="stat-val">{stats?.class_name || 'N/A'}</span>
            </div>
            <div className="stat-icon-wrapper"><Users size={24} /></div>
          </div>

          <div className="stat-card glass-panel accent-purple">
            <div className="stat-info">
              <span className="stat-label">Total Students</span>
              <span className="stat-val">{stats?.total_students || 0}</span>
            </div>
            <div className="stat-icon-wrapper"><Users size={24} /></div>
          </div>

          <div className="stat-card glass-panel accent-green">
            <div className="stat-info">
              <span className="stat-label">Active Roster</span>
              <span className="stat-val">{stats?.active_students || 0}</span>
            </div>
            <div className="stat-icon-wrapper"><Users size={24} /></div>
          </div>

          <div className="stat-card glass-panel accent-amber">
            <div className="stat-info">
              <span className="stat-label">Pending Reviews</span>
              <span className="stat-val">{stats?.pending_marks_entries_count || 0}</span>
            </div>
            <div className="stat-icon-wrapper"><Award size={24} /></div>
          </div>
        </div>

        <div className="dashboard-grid">
          <div className="data-panel glass-panel">
            <div className="panel-header">
              <h3 className="panel-title">Recent Marks Activity</h3>
            </div>
            <div className="table-wrapper">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Exam</th>
                    <th>Subject</th>
                    <th>Marks</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {stats?.recent_marks && stats.recent_marks.map((m) => (
                    <tr key={m.id}>
                      <td><strong>{m.student_name}</strong></td>
                      <td>{m.exam_type}</td>
                      <td>{m.subject}</td>
                      <td>{m.marks_obtained} / 100</td>
                      <td>
                        <span className={`status-badge status-${m.status}`}>{m.status}</span>
                      </td>
                    </tr>
                  ))}
                  {(!stats?.recent_marks || stats.recent_marks.length === 0) && (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)' }}>
                        No recent marks activity in this class.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="data-panel glass-panel">
            <div className="panel-header">
              <h3 className="panel-title">Grading Rules</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>
              <p>1. Marks are submitted as <strong>draft</strong> first.</p>
              <p>2. Teachers can edit draft records up to <strong>2 times</strong>. The third edit locks the record, requiring Admin intervention.</p>
              <p>3. Once draft marks are complete for a student's exam, submit them. The status changes to <strong>submitted</strong>.</p>
              <p>4. After the Admin **approves** the marks, parents can immediately view them on their portal.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (currentView === 'students') {
    return (
      <div className="data-panel glass-panel">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">My Classroom Enrollment</h3>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Class list for: {stats?.class_name}</span>
          </div>
          <button className="btn btn-primary btn-sm" onClick={handleOpenAddModal}>
            <Plus size={16} /> Add Student
          </button>
        </div>

        <div className="table-wrapper">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Student ID</th>
                <th>Admission No</th>
                <th>Name</th>
                <th>Gender</th>
                <th>Father's Name</th>
                <th>Contact</th>
                <th>Family ID</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id}>
                  <td><strong style={{ color: 'var(--accent-cyan)' }}>{s.student_id}</strong></td>
                  <td>{s.admission_number}</td>
                  <td>{s.name}</td>
                  <td>{s.gender}</td>
                  <td>{s.father_name}</td>
                  <td>{s.contact_number}</td>
                  <td>{s.family_id}</td>
                  <td>
                    <span className={`status-badge status-${s.status}`}>{s.status}</span>
                  </td>
                  <td>
                    <button className="btn btn-secondary btn-sm" onClick={() => handleOpenEditModal(s)} style={{ padding: '6px' }} title="Edit">
                      <Edit size={14} />
                    </button>
                  </td>
                </tr>
              ))}
              {students.length === 0 && (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    No students enrolled in your class yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* PREVENT OVERLAPS: MODAL POPUP */}
        {showFormModal && (
          <div className="modal-overlay">
            <div className="modal-content glass-panel">
              <button className="modal-close" onClick={() => setShowFormModal(false)}>
                <X size={20} />
              </button>
              <h3 style={{ marginBottom: '24px', color: 'var(--accent-cyan)' }}>
                {editingStudent ? `Modify Class Student: ${editingStudent.student_id}` : 'Enroll New Student in My Class'}
              </h3>
              
              <form onSubmit={handleFormSubmit}>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Admission Number</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={studentForm.admission_number}
                      onChange={(e) => setStudentForm({...studentForm, admission_number: e.target.value})}
                      required
                      disabled={editingStudent}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Student Name</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={studentForm.name}
                      onChange={(e) => setStudentForm({...studentForm, name: e.target.value})}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Date of Birth</label>
                    <input 
                      type="date" 
                      className="form-control" 
                      value={studentForm.date_of_birth}
                      onChange={(e) => setStudentForm({...studentForm, date_of_birth: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Gender</label>
                    <select 
                      className="form-control" 
                      value={studentForm.gender}
                      onChange={(e) => setStudentForm({...studentForm, gender: e.target.value})}
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Father's Name</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={studentForm.father_name}
                      onChange={(e) => setStudentForm({...studentForm, father_name: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Mother's Name</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={studentForm.mother_name}
                      onChange={(e) => setStudentForm({...studentForm, mother_name: e.target.value})}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Residential Address</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={studentForm.address}
                    onChange={(e) => setStudentForm({...studentForm, address: e.target.value})}
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Contact Number</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={studentForm.contact_number}
                      onChange={(e) => setStudentForm({...studentForm, contact_number: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Emergency Contact</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={studentForm.emergency_contact}
                      onChange={(e) => setStudentForm({...studentForm, emergency_contact: e.target.value})}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Bus Number (Optional)</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={studentForm.bus_number}
                      onChange={(e) => setStudentForm({...studentForm, bus_number: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Bus Route (Optional)</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={studentForm.bus_route}
                      onChange={(e) => setStudentForm({...studentForm, bus_route: e.target.value})}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Annual Tuition Fee (₹)</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      value={studentForm.annual_fee}
                      onChange={(e) => setStudentForm({...studentForm, annual_fee: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Family ID</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={studentForm.family_id}
                      onChange={(e) => setStudentForm({...studentForm, family_id: e.target.value})}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowFormModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Enroll Student</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (currentView === 'marks') {
    return (
      <div className="dashboard-grid">
        {/* Marks Entry Panel */}
        <div className="data-panel glass-panel">
          <div className="panel-header">
            <h3 className="panel-title">Marks Entry Ledger</h3>
          </div>
          
          <form onSubmit={handleEnterMarks}>
            {marksError && (
              <div className="status-badge status-inactive" style={{ width: '100%', marginBottom: '16px', padding: '8px', textAlign: 'center' }}>
                {marksError}
              </div>
            )}
            {marksSuccess && (
              <div className="status-badge status-active" style={{ width: '100%', marginBottom: '16px', padding: '8px', textAlign: 'center' }}>
                {marksSuccess}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Student</label>
              <select 
                className="form-control" 
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

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Exam Type</label>
                <select 
                  className="form-control" 
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

              <div className="form-group">
                <label className="form-label">Subject</label>
                <select 
                  className="form-control" 
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

            <div className="form-group">
              <label className="form-label">Marks Obtained (out of 100)</label>
              <input 
                type="number" 
                className="form-control" 
                min="0" 
                max="100" 
                placeholder="Enter score"
                value={scoreInput}
                onChange={(e) => setScoreInput(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
              Save Score
            </button>
          </form>
        </div>

        {/* Existing Marks in Class */}
        <div className="data-panel glass-panel">
          <div className="panel-header">
            <h3 className="panel-title">Saved Marks Sheets</h3>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '450px', overflowY: 'auto' }}>
            {students.map(s => {
              const studentMarks = marks.filter(m => m.student_id === s.id);
              if (studentMarks.length === 0) return null;
              
              // Group marks by exam type
              const examsList = ['FA-1', 'FA-2', 'SA-1', 'FA-3', 'FA-4', 'SA-2'];
              
              return (
                <div key={s.id} className="glass-panel" style={{ padding: '16px', background: 'rgba(255,255,255,0.01)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <strong style={{ fontSize: '13px', color: 'var(--accent-cyan)' }}>{s.name}</strong>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{s.student_id}</span>
                  </div>
                  
                  {examsList.map(ex => {
                    const examMarks = studentMarks.filter(m => m.exam_type === ex);
                    if (examMarks.length === 0) return null;
                    
                    const isAllDraft = examMarks.every(m => m.status === 'draft');
                    
                    return (
                      <div key={ex} style={{ marginBottom: '12px', borderTop: '1px solid var(--border-light)', paddingTop: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <span style={{ fontSize: '11px', fontWeight: '600' }}>{ex} Marks</span>
                          {isAllDraft && (
                            <button 
                              className="btn btn-secondary btn-sm" 
                              onClick={() => handleSubmitExamForApproval(s.id, ex)}
                              style={{ padding: '2px 6px', fontSize: '9px' }}
                            >
                              Submit {ex}
                            </button>
                          )}
                        </div>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                          {examMarks.map(em => (
                            <div key={em.id} style={{ background: 'rgba(0,0,0,0.1)', padding: '6px', borderRadius: '4px', textAlign: 'center' }}>
                              <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>{em.subject}</div>
                              <div style={{ fontSize: '12px', fontWeight: '700' }}>{em.marks_obtained}</div>
                              <div style={{ fontSize: '8px', color: 'var(--text-muted)' }}>
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
        </div>
      </div>
    );
  }

  return null;
};

export default TeacherDashboard;
