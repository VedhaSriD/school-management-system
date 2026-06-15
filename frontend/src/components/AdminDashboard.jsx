import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Users, 
  DollarSign, 
  BookOpen, 
  Trash2, 
  Edit, 
  Plus, 
  Sparkles, 
  Send, 
  Check, 
  Unlock,
  X
} from 'lucide-react';

const AdminDashboard = ({ currentView }) => {
  const { authenticatedFetch, API_URL } = useAuth();
  const [stats, setStats] = useState(null);
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [marks, setMarks] = useState([]);
  
  // Modals
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // AI Chat
  const [chatMessages, setChatMessages] = useState([
    { sender: 'assistant', text: 'Hello Admin! I am your read-only VIS AI Assistant. Ask me anything about student records, fee status, class rosters, marks, or bus routes.' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  
  // Form state
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
    annual_fee: '',
    family_id: '',
    class_id: '',
    status: 'active'
  });

  const fetchStats = async () => {
    try {
      const res = await authenticatedFetch(`${API_URL}/api/dashboard/admin`);
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

  const fetchClasses = async () => {
    try {
      const res = await authenticatedFetch(`${API_URL}/api/classes`);
      if (res.ok) {
        const data = await res.json();
        setClasses(data);
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
      fetchClasses();
    } else if (currentView === 'marks') {
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
      annual_fee: '',
      family_id: '',
      class_id: classes[0]?.id || '',
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
        class_id: parseInt(studentForm.class_id),
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
        alert(errorData.detail || "Failed to save student");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteStudent = async (studentId) => {
    if (!window.confirm("Are you sure you want to delete this student record? This will permanently affect fee calculations and metrics.")) return;
    try {
      const res = await authenticatedFetch(`${API_URL}/api/students/${studentId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchStudents();
        fetchStats();
      } else {
        alert("Failed to delete student");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleApproveMark = async (markId) => {
    try {
      const res = await authenticatedFetch(`${API_URL}/api/marks/approve/${markId}`, {
        method: 'POST'
      });
      if (res.ok) {
        fetchMarks();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUnlockMark = async (markId) => {
    try {
      const res = await authenticatedFetch(`${API_URL}/api/marks/unlock/${markId}`, {
        method: 'POST'
      });
      if (res.ok) {
        fetchMarks();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendChat = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    
    const userMsg = chatInput;
    setChatMessages(prev => [...prev, { sender: 'user', text: userMsg }]);
    setChatInput('');
    setAiLoading(true);
    
    try {
      const res = await authenticatedFetch(`${API_URL}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg })
      });
      if (res.ok) {
        const data = await res.json();
        setChatMessages(prev => [...prev, { sender: 'assistant', text: data.response }]);
      } else {
        setChatMessages(prev => [...prev, { sender: 'assistant', text: 'Error contacting AI endpoint.' }]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAiLoading(false);
    }
  };

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.student_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.admission_number.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (currentView === 'dashboard') {
    return (
      <div>
        <div className="stats-grid">
          <div className="stat-card glass-panel accent-cyan">
            <div className="stat-info">
              <span className="stat-label">Total Registered</span>
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

          <div className="stat-card glass-panel accent-purple">
            <div className="stat-info">
              <span className="stat-label">Faculty Staff</span>
              <span className="stat-val">{stats?.total_teachers || 0}</span>
            </div>
            <div className="stat-icon-wrapper"><Users size={24} /></div>
          </div>

          <div className="stat-card glass-panel accent-amber">
            <div className="stat-info">
              <span className="stat-label">Collected Fees</span>
              <span className="stat-val">₹{stats ? parseFloat(stats.total_fees_collected).toLocaleString('en-IN') : '0'}</span>
            </div>
            <div className="stat-icon-wrapper"><DollarSign size={24} /></div>
          </div>

          <div className="stat-card glass-panel accent-red">
            <div className="stat-info">
              <span className="stat-label">Outstanding Dues</span>
              <span className="stat-val">₹{stats ? parseFloat(stats.total_fees_pending).toLocaleString('en-IN') : '0'}</span>
            </div>
            <div className="stat-icon-wrapper"><DollarSign size={24} /></div>
          </div>
        </div>

        <div className="dashboard-grid">
          <div className="data-panel glass-panel">
            <div className="panel-header">
              <h3 className="panel-title">Active Class Enrollment</h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '16px' }}>
              {stats?.class_wise_student_counts && Object.entries(stats.class_wise_student_counts).map(([cls, count]) => (
                <div key={cls} className="glass-panel" style={{ padding: '16px', textAlign: 'center', background: 'rgba(255,255,255,0.02)' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>{cls}</div>
                  <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--accent-cyan)' }}>{count}</div>
                  <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Students</div>
                </div>
              ))}
            </div>
          </div>

          <div className="data-panel glass-panel">
            <div className="panel-header">
              <h3 className="panel-title">Administrative Actions</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', fontSize: '13px' }}>
                <strong style={{ color: 'var(--accent-cyan)' }}>Real-time Sync Active</strong>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>All statistics and financial ledger balances recalculate automatically on payment or registry updates.</p>
              </div>
              <div style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', fontSize: '13px' }}>
                <strong style={{ color: 'var(--accent-purple)' }}>Marks Approval Lock</strong>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Submit requests by faculty are locked until reviewed. Edit limits strictly enforced to prevent record tampering.</p>
              </div>
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
            <h3 className="panel-title">Student Registry Management</h3>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Total: {filteredStudents.length} records</span>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <input 
              type="text" 
              className="form-control" 
              placeholder="Search by name, ID or ADM..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '240px', padding: '8px 12px' }}
            />
            <button className="btn btn-primary btn-sm" onClick={handleOpenAddModal}>
              <Plus size={16} /> Add Student
            </button>
          </div>
        </div>

        <div className="table-wrapper">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Student ID</th>
                <th>Admission No</th>
                <th>Name</th>
                <th>Class</th>
                <th>Annual Fee</th>
                <th>Family ID</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((s) => (
                <tr key={s.id}>
                  <td><strong style={{ color: 'var(--accent-cyan)' }}>{s.student_id}</strong></td>
                  <td>{s.admission_number}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <img src={s.photo_url || `https://api.dicebear.com/7.x/initials/svg?seed=${s.name}`} style={{ width: '24px', height: '24px', borderRadius: '50%' }} alt="avatar" />
                      <span>{s.name}</span>
                    </div>
                  </td>
                  <td>{s.class_name}</td>
                  <td>₹{parseFloat(s.annual_fee).toLocaleString('en-IN')}</td>
                  <td>{s.family_id}</td>
                  <td>
                    <span className={`status-badge status-${s.status}`}>{s.status}</span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => handleOpenEditModal(s)} style={{ padding: '6px' }} title="Edit">
                        <Edit size={14} />
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDeleteStudent(s.id)} style={{ padding: '6px' }} title="Delete">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredStudents.length === 0 && (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    No student records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* PREVENT OVERLAPS: STRICT POPUP MODAL OVERLAY */}
        {showFormModal && (
          <div className="modal-overlay">
            <div className="modal-content glass-panel">
              <button className="modal-close" onClick={() => setShowFormModal(false)}>
                <X size={20} />
              </button>
              <h3 style={{ marginBottom: '24px', color: 'var(--accent-cyan)' }}>
                {editingStudent ? `Modify Student: ${editingStudent.student_id}` : 'Register New Student'}
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
                    <label className="form-label">Family ID (Siblings link)</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={studentForm.family_id}
                      onChange={(e) => setStudentForm({...studentForm, family_id: e.target.value})}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Class</label>
                    <select 
                      className="form-control" 
                      value={studentForm.class_id}
                      onChange={(e) => setStudentForm({...studentForm, class_id: e.target.value})}
                      required
                    >
                      {classes.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select 
                      className="form-control" 
                      value={studentForm.status}
                      onChange={(e) => setStudentForm({...studentForm, status: e.target.value})}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Student Photo URL (Optional)</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={studentForm.photo_url}
                    onChange={(e) => setStudentForm({...studentForm, photo_url: e.target.value})}
                  />
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowFormModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Save Profile</button>
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
      <div className="data-panel glass-panel">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">Academic Grading approvals</h3>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Approve or unlock grading entries entered by teachers.</span>
          </div>
        </div>

        <div className="table-wrapper">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Exam</th>
                <th>Subject</th>
                <th>Score</th>
                <th>Edits</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {marks.map((m) => (
                <tr key={m.id}>
                  <td><strong>{m.student_name}</strong></td>
                  <td>{m.exam_type}</td>
                  <td>{m.subject}</td>
                  <td>{m.marks_obtained} / {m.max_marks}</td>
                  <td>{m.edit_count} / 2</td>
                  <td>
                    <span className={`status-badge status-${m.status}`}>{m.status}</span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {m.status !== 'approved' && (
                        <button className="btn btn-primary btn-sm" onClick={() => handleApproveMark(m.id)} title="Approve">
                          <Check size={14} /> Approve
                        </button>
                      )}
                      {m.edit_count >= 2 && (
                        <button className="btn btn-secondary btn-sm" onClick={() => handleUnlockMark(m.id)} title="Unlock edits">
                          <Unlock size={14} /> Unlock
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {marks.length === 0 && (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    No marks entries submitted for review.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (currentView === 'assistant') {
    return (
      <div className="data-panel glass-panel ai-assistant-container">
        <div className="panel-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Sparkles size={20} className="text-accent" style={{ color: 'var(--accent-cyan)' }} />
            <div>
              <h3 className="panel-title">VIS Admin AI Assistant</h3>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Secure, read-only intelligence tool. Uses modern Google Gemini SDK.</span>
            </div>
          </div>
        </div>

        <div className="chat-messages">
          {chatMessages.map((msg, idx) => (
            <div key={idx} className={`chat-bubble ${msg.sender}`}>
              <div style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</div>
            </div>
          ))}
          {aiLoading && (
            <div className="chat-bubble assistant">
              <span style={{ color: 'var(--accent-cyan)' }}>Gemini is thinking...</span>
            </div>
          )}
        </div>

        <form onSubmit={handleSendChat} className="chat-input-row">
          <input 
            type="text" 
            className="form-control" 
            placeholder="Ask e.g. 'Who has pending fees?' or 'What are details of Aarav Reddy?'" 
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            disabled={aiLoading}
          />
          <button type="submit" className="btn btn-primary" disabled={aiLoading}>
            <Send size={16} />
          </button>
        </form>
      </div>
    );
  }

  return null;
};

export default AdminDashboard;
