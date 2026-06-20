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
import AdminFinance from './AdminFinance';
import Card from './ui/Card';
import StatCard from './ui/StatCard';
import Button from './ui/Button';
import DataTable from './ui/DataTable';
import '../styles/AdminDashboard.css';

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
      <div className="admin-view">
        <div className="admin-view__hero-bg" aria-hidden="true" />

        <div className="admin-stats-grid stagger-reveal">
          <StatCard
            label="Total Registered"
            value={stats?.total_students || 0}
            icon={<Users size={20} />}
            tone="info"
          />
          <StatCard
            label="Active Roster"
            value={stats?.active_students || 0}
            icon={<Users size={20} />}
            tone="success"
          />
          <StatCard
            label="Faculty Staff"
            value={stats?.total_teachers || 0}
            icon={<Users size={20} />}
            tone="neutral"
          />
          <StatCard
            label="Collected Fees"
            value={`₹${stats ? parseFloat(stats.total_fees_collected).toLocaleString('en-IN') : '0'}`}
            icon={<DollarSign size={20} />}
            tone="warning"
          />
          <StatCard
            label="Outstanding Dues"
            value={`₹${stats ? parseFloat(stats.total_fees_pending).toLocaleString('en-IN') : '0'}`}
            icon={<DollarSign size={20} />}
            tone="danger"
          />
        </div>

        <div className="admin-dashboard-grid">
          <Card elevated>
            <h3 className="text-section-title admin-panel__title">Active Class Enrollment</h3>
            <div className="admin-class-grid">
              {stats?.class_wise_student_counts && Object.entries(stats.class_wise_student_counts).map(([cls, count]) => (
                <div key={cls} className="admin-class-tile">
                  <div className="text-caption">{cls}</div>
                  <div className="admin-class-tile__count">{count}</div>
                  <div className="text-caption">Students</div>
                </div>
              ))}
            </div>
          </Card>

          <Card elevated>
            <h3 className="text-section-title admin-panel__title">Administrative Notes</h3>
            <div className="admin-note-list">
              <div className="admin-note admin-note--info">
                <strong>Real-time Sync Active</strong>
                <p>All statistics and financial ledger balances recalculate automatically on payment or registry updates.</p>
              </div>
              <div className="admin-note admin-note--warning">
                <strong>Marks Approval Lock</strong>
                <p>Submit requests by faculty are locked until reviewed. Edit limits strictly enforced to prevent record tampering.</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (currentView === 'students') {
    return (
      <div className="admin-view">
        <Card elevated className="admin-table-card">
          <div className="admin-panel__header">
            <div>
              <h3 className="text-section-title admin-panel__title">Student Registry Management</h3>
              <span className="text-caption">Total: {filteredStudents.length} records</span>
            </div>
            <div className="admin-panel__actions">
              <input 
                type="text" 
                className="admin-search-input" 
                placeholder="Search by name, ID or ADM..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Button variant="primary" size="sm" onClick={handleOpenAddModal}>
                <Plus size={16} /> Add Student
              </Button>
            </div>
          </div>

          <DataTable
            columns={[
              { key: 'student_id', header: 'Student ID', render: (s) => <strong className="admin-id-cell">{s.student_id}</strong> },
              { key: 'admission_number', header: 'Admission No' },
              {
                key: 'name',
                header: 'Name',
                render: (s) => (
                  <div className="admin-name-cell">
                    <img
                      src={s.photo_url || `https://api.dicebear.com/7.x/initials/svg?seed=${s.name}`}
                      className="admin-avatar"
                      alt="avatar"
                    />
                    <span>{s.name}</span>
                  </div>
                ),
              },
              { key: 'class_name', header: 'Class' },
              { key: 'annual_fee', header: 'Annual Fee', align: 'right', render: (s) => `₹${parseFloat(s.annual_fee).toLocaleString('en-IN')}` },
              { key: 'family_id', header: 'Family ID' },
              {
                key: 'status',
                header: 'Status',
                render: (s) => <span className={`admin-status-badge admin-status-badge--${s.status}`}>{s.status}</span>,
              },
              {
                key: 'actions',
                header: 'Actions',
                align: 'center',
                render: (s) => (
                  <div className="admin-row-actions">
                    <Button variant="outline" size="sm" onClick={() => handleOpenEditModal(s)} title="Edit">
                      <Edit size={14} />
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => handleDeleteStudent(s.id)} title="Delete">
                      <Trash2 size={14} />
                    </Button>
                  </div>
                ),
              },
            ]}
            data={filteredStudents}
            rowKey="id"
            emptyMessage="No student records found."
          />
        </Card>

        {/* PREVENT OVERLAPS: STRICT POPUP MODAL OVERLAY */}
        {showFormModal && (
          <div className="admin-modal-overlay">
            <Card elevated className="admin-modal-content">
              <button className="admin-modal-close" onClick={() => setShowFormModal(false)}>
                <X size={20} />
              </button>
              <h3 className="admin-modal-title">
                {editingStudent ? `Modify Student: ${editingStudent.student_id}` : 'Register New Student'}
              </h3>
              
              <form onSubmit={handleFormSubmit} className="admin-form">
                <div className="admin-form-row">
                  <div className="admin-form-group">
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
                  <div className="admin-form-group">
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

                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <label className="login-form__label">Date of Birth</label>
                    <input 
                      type="date" 
                      className="login-form__input" 
                      value={studentForm.date_of_birth}
                      onChange={(e) => setStudentForm({...studentForm, date_of_birth: e.target.value})}
                      required
                    />
                  </div>
                  <div className="admin-form-group">
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

                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <label className="login-form__label">Father's Name</label>
                    <input 
                      type="text" 
                      className="login-form__input" 
                      value={studentForm.father_name}
                      onChange={(e) => setStudentForm({...studentForm, father_name: e.target.value})}
                      required
                    />
                  </div>
                  <div className="admin-form-group">
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

                <div className="admin-form-group">
                  <label className="login-form__label">Residential Address</label>
                  <input 
                    type="text" 
                    className="login-form__input" 
                    value={studentForm.address}
                    onChange={(e) => setStudentForm({...studentForm, address: e.target.value})}
                    required
                  />
                </div>

                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <label className="login-form__label">Contact Number</label>
                    <input 
                      type="text" 
                      className="login-form__input" 
                      value={studentForm.contact_number}
                      onChange={(e) => setStudentForm({...studentForm, contact_number: e.target.value})}
                      required
                    />
                  </div>
                  <div className="admin-form-group">
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

                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <label className="login-form__label">Bus Number (Optional)</label>
                    <input 
                      type="text" 
                      className="login-form__input" 
                      value={studentForm.bus_number}
                      onChange={(e) => setStudentForm({...studentForm, bus_number: e.target.value})}
                    />
                  </div>
                  <div className="admin-form-group">
                    <label className="login-form__label">Bus Route (Optional)</label>
                    <input 
                      type="text" 
                      className="login-form__input" 
                      value={studentForm.bus_route}
                      onChange={(e) => setStudentForm({...studentForm, bus_route: e.target.value})}
                    />
                  </div>
                </div>

                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <label className="login-form__label">Annual Tuition Fee (₹)</label>
                    <input 
                      type="number" 
                      className="login-form__input" 
                      value={studentForm.annual_fee}
                      onChange={(e) => setStudentForm({...studentForm, annual_fee: e.target.value})}
                      required
                    />
                  </div>
                  <div className="admin-form-group">
                    <label className="login-form__label">Family ID (Siblings link)</label>
                    <input 
                      type="text" 
                      className="login-form__input" 
                      value={studentForm.family_id}
                      onChange={(e) => setStudentForm({...studentForm, family_id: e.target.value})}
                      required
                    />
                  </div>
                </div>

                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <label className="login-form__label">Class</label>
                    <select 
                      className="login-form__input" 
                      value={studentForm.class_id}
                      onChange={(e) => setStudentForm({...studentForm, class_id: e.target.value})}
                      required
                    >
                      {classes.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="admin-form-group">
                    <label className="login-form__label">Status</label>
                    <select 
                      className="login-form__input" 
                      value={studentForm.status}
                      onChange={(e) => setStudentForm({...studentForm, status: e.target.value})}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                <div className="admin-form-group">
                  <label className="login-form__label">Student Photo URL (Optional)</label>
                  <input 
                    type="text" 
                    className="login-form__input" 
                    value={studentForm.photo_url}
                    onChange={(e) => setStudentForm({...studentForm, photo_url: e.target.value})}
                  />
                </div>

                <div className="admin-form-footer">
                  <Button type="button" variant="outline" onClick={() => setShowFormModal(false)}>Cancel</Button>
                  <Button type="submit" variant="primary">Save Profile</Button>
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
      <div className="admin-view">
        <Card elevated className="admin-table-card">
          <div className="admin-panel__header">
            <div>
              <h3 className="text-section-title admin-panel__title">Academic Grading Approvals</h3>
              <span className="text-caption">Approve or unlock grading entries entered by teachers.</span>
            </div>
          </div>

          <DataTable
            columns={[
              { key: 'student_name', header: 'Student', render: (m) => <strong>{m.student_name}</strong> },
              { key: 'exam_type', header: 'Exam' },
              { key: 'subject', header: 'Subject' },
              { key: 'score', header: 'Score', render: (m) => `${m.marks_obtained} / ${m.max_marks}` },
              { key: 'edit_count', header: 'Edits', render: (m) => `${m.edit_count} / 2` },
              {
                key: 'status',
                header: 'Status',
                render: (m) => <span className={`admin-status-badge admin-status-badge--${m.status}`}>{m.status}</span>,
              },
              {
                key: 'actions',
                header: 'Actions',
                render: (m) => (
                  <div className="admin-row-actions">
                    {m.status !== 'approved' && (
                      <Button variant="primary" size="sm" onClick={() => handleApproveMark(m.id)} title="Approve">
                        <Check size={14} /> Approve
                      </Button>
                    )}
                    {m.edit_count >= 2 && (
                      <Button variant="outline" size="sm" onClick={() => handleUnlockMark(m.id)} title="Unlock edits">
                        <Unlock size={14} /> Unlock
                      </Button>
                    )}
                  </div>
                ),
              },
            ]}
            data={marks}
            rowKey="id"
            emptyMessage="No marks entries submitted for review."
          />
        </Card>
      </div>
    );
  }
  if (currentView === 'finance') {
    return <AdminFinance />;
  }


  if (currentView === 'assistant') {
    return (
      <div className="admin-view">
        <Card elevated className="admin-chat-card">
          <div className="admin-chat-header">
            <Sparkles size={20} className="admin-chat-header__icon" />
            <div>
              <h3 className="text-section-title admin-panel__title">VIS Admin AI Assistant</h3>
              <span className="text-caption">Secure, read-only intelligence tool. Uses modern Google Gemini SDK.</span>
            </div>
          </div>

          <div className="admin-chat-messages">
            {chatMessages.map((msg, idx) => (
              <div key={idx} className={`admin-chat-bubble admin-chat-bubble--${msg.sender}`}>
                <div className="admin-chat-bubble__text">{msg.text}</div>
              </div>
            ))}
            {aiLoading && (
              <div className="admin-chat-bubble admin-chat-bubble--assistant">
                <span className="admin-chat-thinking">Gemini is thinking…</span>
              </div>
            )}
          </div>

          <form onSubmit={handleSendChat} className="admin-chat-input-row">
            <input 
              type="text" 
              className="login-form__input admin-chat-input" 
              placeholder="Ask e.g. 'Who has pending fees?' or 'What are details of Aarav Reddy?'" 
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              disabled={aiLoading}
            />
            <Button type="submit" variant="primary" disabled={aiLoading}>
              <Send size={16} />
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  return null;
};

export default AdminDashboard;