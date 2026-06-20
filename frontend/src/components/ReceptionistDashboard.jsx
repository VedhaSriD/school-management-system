import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  DollarSign, 
  Users, 
  Ticket, 
  Plus, 
  Edit, 
  X, 
  Check, 
  FileText, 
  Search 
} from 'lucide-react';
import Card from './ui/Card';
import StatCard from './ui/StatCard';
import Button from './ui/Button';
import DataTable from './ui/DataTable';
import '../styles/ReceptionistDashboard.css';

const ReceptionistDashboard = ({ currentView }) => {
  const { authenticatedFetch, API_URL } = useAuth();
  const [stats, setStats] = useState(null);
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [payments, setPayments] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  
  // Payment Collection State
  const [collectingStudent, setCollectingStudent] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [payError, setPayError] = useState(null);
  const [paySuccess, setPaySuccess] = useState(null);

  // Student Form State
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
      const res = await authenticatedFetch(`${API_URL}/api/dashboard/receptionist`);
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

      console.log(data);

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

  const fetchPayments = async () => {
    try {
      const res = await authenticatedFetch(`${API_URL}/api/fees/payments`);
      if (res.ok) {
        const data = await res.json();
        setPayments(data);
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
    } else if (currentView === 'fees') {
      fetchStudents();
      fetchPayments();
    } else if (currentView === 'tickets') {
      fetchStudents();
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

  const handleCollectPayment = async (e) => {
    e.preventDefault();
    setPayError(null);
    setPaySuccess(null);
    if (!collectingStudent || !paymentAmount) return;

    try {
      const res = await authenticatedFetch(`${API_URL}/api/fees/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: collectingStudent,
          amount_paid: parseFloat(paymentAmount),
          payment_method: paymentMethod,
          payment_date: paymentDate
        })
      });

      const data = await res.json();

      if (res.ok) {
        setPaySuccess(`Fee collected successfully! Receipt: ${data.receipt_number}`);
        setPaymentAmount('');
        fetchPayments();
        fetchStats();
        fetchStudents(); // Refresh balance information
      } else {
        setPayError(data.detail || "Transaction failed.");
      }
    } catch (err) {
      setPayError("Network connection failed.");
    }
  };

  const handleToggleHallTicket = async (studentId, isApproved) => {
    try {
      const res = await authenticatedFetch(
        `${API_URL}/api/fees/hall-tickets/approve/${studentId}?approved=${isApproved}`,
        { method: 'POST' }
      );
      if (res.ok) {
        fetchStudents();
        fetchStats();
      } else {
        const d = await res.json();
        alert(d.detail || "Failed to toggle hall ticket approval");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDownloadReceipt = (paymentId, receiptNo) => {
    const token = localStorage.getItem('vis_token');
    // Open in new window with bearer token logic on backend
    window.open(`${API_URL}/api/pdf/receipt/${paymentId}?token=${token}`, '_blank');
  };

  const handleDownloadHallTicket = (studentId) => {
    const token = localStorage.getItem('vis_token');
    window.open(`${API_URL}/api/pdf/hall-ticket/${studentId}?token=${token}`, '_blank');
  };

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.student_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.admission_number.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (currentView === 'dashboard') {
    return (
      <div className="recep-view">
        <div className="recep-stats-grid stagger-reveal">
          <StatCard
            label="Collections Today"
            value={`₹${stats ? parseFloat(stats.total_payments_today).toLocaleString('en-IN') : '0'}`}
            icon={<DollarSign size={20} />}
            tone="success"
          />
          <StatCard
            label="Receipts Processed"
            value={stats?.total_payments_count_today || 0}
            icon={<FileText size={20} />}
            tone="info"
          />
          <StatCard
            label="Pending Hall Tickets"
            value={stats?.pending_hall_ticket_approvals || 0}
            icon={<Ticket size={20} />}
            tone="warning"
          />
        </div>

        <div className="recep-dashboard-grid">
          <Card elevated>
            <h3 className="text-section-title recep-panel__title">Recent Payments Feed</h3>
            <DataTable
              columns={[
                { key: 'receipt_number', header: 'Receipt No', render: (p) => <strong className="recep-id-cell">{p.receipt_number}</strong> },
                { key: 'student_name', header: 'Student' },
                { key: 'payment_date', header: 'Date' },
                { key: 'payment_method', header: 'Method' },
                { key: 'amount_paid', header: 'Amount', align: 'right', render: (p) => `₹${parseFloat(p.amount_paid).toLocaleString('en-IN')}` },
                {
                  key: 'action',
                  header: 'Action',
                  align: 'center',
                  render: (p) => (
                    <Button variant="outline" size="sm" onClick={() => handleDownloadReceipt(p.id, p.receipt_number)}>
                      PDF
                    </Button>
                  ),
                },
              ]}
              data={stats?.recent_payments || []}
              rowKey="id"
              emptyMessage="No payments logged today yet."
            />
          </Card>

          <Card elevated>
            <h3 className="text-section-title recep-panel__title">Quick Tasks</h3>
            <div className="recep-note">
              <strong>No Overlap Layouts</strong>
              <p>All profile creations and billing logs are isolated in modals. Click any tab above to get started.</p>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (currentView === 'students') {
    return (
      <div className="recep-view">
        <Card elevated className="recep-table-card">
          <div className="recep-panel__header">
            <div>
              <h3 className="text-section-title recep-panel__title">Student Admissions Desk</h3>
              <span className="text-caption">Manage profile listings and new admissions.</span>
            </div>
            <div className="recep-panel__actions">
              <input 
                type="text" 
                className="recep-search-input" 
                placeholder="Search registry..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Button variant="primary" size="sm" onClick={handleOpenAddModal}>
                <Plus size={16} /> New Student
              </Button>
            </div>
          </div>

          <DataTable
            columns={[
              { key: 'student_id', header: 'Student ID', render: (s) => <strong className="recep-id-cell">{s.student_id}</strong> },
              { key: 'admission_number', header: 'Admission No' },
              { key: 'name', header: 'Name' },
              { key: 'class_name', header: 'Class' },
              { key: 'annual_fee', header: 'Annual Fee', align: 'right', render: (s) => `₹${parseFloat(s.annual_fee).toLocaleString('en-IN')}` },
              { key: 'total_paid', header: 'Total Paid', align: 'right', render: (s) => `₹${parseFloat(s.total_paid || 0).toLocaleString('en-IN')}` },
              {
                key: 'pending_fee',
                header: 'Pending Fee',
                align: 'right',
                render: (s) => (
                  <strong className={parseFloat(s.pending_fee || 0) > 0 ? 'recep-pending-due' : 'recep-pending-clear'}>
                    ₹{parseFloat(s.pending_fee || 0).toLocaleString('en-IN')}
                  </strong>
                ),
              },
              { key: 'father_name', header: "Father's Name" },
              { key: 'contact_number', header: 'Contact' },
              {
                key: 'status',
                header: 'Status',
                render: (s) => <span className={`recep-status-badge recep-status-badge--${s.status}`}>{s.status}</span>,
              },
              {
                key: 'action',
                header: 'Action',
                align: 'center',
                render: (s) => (
                  <Button variant="outline" size="sm" onClick={() => handleOpenEditModal(s)} title="Edit">
                    <Edit size={14} />
                  </Button>
                ),
              },
            ]}
            data={filteredStudents}
            rowKey="id"
            emptyMessage="No student profiles found."
          />
        </Card>

        {/* POPUP MODAL */}
        {showFormModal && (
          <div className="recep-modal-overlay">
            <Card elevated className="recep-modal-content">
              <button className="recep-modal-close" onClick={() => setShowFormModal(false)}>
                <X size={20} />
              </button>
              <h3 className="recep-modal-title">
                {editingStudent ? `Modify Student Details: ${editingStudent.student_id}` : 'Admit New Student'}
              </h3>
              
              <form onSubmit={handleFormSubmit} className="recep-form">
                <div className="recep-form-row">
                  <div className="recep-form-group">
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
                  <div className="recep-form-group">
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

                <div className="recep-form-row">
                  <div className="recep-form-group">
                    <label className="login-form__label">Date of Birth</label>
                    <input 
                      type="date" 
                      className="login-form__input" 
                      value={studentForm.date_of_birth}
                      onChange={(e) => setStudentForm({...studentForm, date_of_birth: e.target.value})}
                      required
                    />
                  </div>
                  <div className="recep-form-group">
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

                <div className="recep-form-row">
                  <div className="recep-form-group">
                    <label className="login-form__label">Father's Name</label>
                    <input 
                      type="text" 
                      className="login-form__input" 
                      value={studentForm.father_name}
                      onChange={(e) => setStudentForm({...studentForm, father_name: e.target.value})}
                      required
                    />
                  </div>
                  <div className="recep-form-group">
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

                <div className="recep-form-group">
                  <label className="login-form__label">Address</label>
                  <input 
                    type="text" 
                    className="login-form__input" 
                    value={studentForm.address}
                    onChange={(e) => setStudentForm({...studentForm, address: e.target.value})}
                    required
                  />
                </div>

                <div className="recep-form-row">
                  <div className="recep-form-group">
                    <label className="login-form__label">Contact Number</label>
                    <input 
                      type="text" 
                      className="login-form__input" 
                      value={studentForm.contact_number}
                      onChange={(e) => setStudentForm({...studentForm, contact_number: e.target.value})}
                      required
                    />
                  </div>
                  <div className="recep-form-group">
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

                <div className="recep-form-row">
                  <div className="recep-form-group">
                    <label className="login-form__label">Bus Number (Optional)</label>
                    <input 
                      type="text" 
                      className="login-form__input" 
                      value={studentForm.bus_number}
                      onChange={(e) => setStudentForm({...studentForm, bus_number: e.target.value})}
                    />
                  </div>
                  <div className="recep-form-group">
                    <label className="login-form__label">Bus Route (Optional)</label>
                    <input 
                      type="text" 
                      className="login-form__input" 
                      value={studentForm.bus_route}
                      onChange={(e) => setStudentForm({...studentForm, bus_route: e.target.value})}
                    />
                  </div>
                </div>

                <div className="recep-form-row">
                  <div className="recep-form-group">
                    <label className="login-form__label">Annual Tuition Fee (₹)</label>
                    <input 
                      type="number" 
                      className="login-form__input" 
                      value={studentForm.annual_fee}
                      onChange={(e) => setStudentForm({...studentForm, annual_fee: e.target.value})}
                      required
                    />
                  </div>
                  <div className="recep-form-group">
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

                <div className="recep-form-row">
                  <div className="recep-form-group">
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
                  <div className="recep-form-group">
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

                <div className="recep-form-group">
                  <label className="login-form__label">Student Photo URL (Optional)</label>
                  <input 
                    type="text" 
                    className="login-form__input" 
                    value={studentForm.photo_url}
                    onChange={(e) => setStudentForm({...studentForm, photo_url: e.target.value})}
                  />
                </div>

                <div className="recep-form-footer">
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

  if (currentView === 'fees') {
    return (
      <div className="recep-view">
        <div className="recep-fees-grid">
          <Card elevated>
            <h3 className="text-section-title recep-panel__title">Collect Tuition Fee</h3>
            
            <form onSubmit={handleCollectPayment} className="recep-fees-form">
              {payError && (
                <div className="recep-form-banner recep-form-banner--error">
                  {payError}
                </div>
              )}
              {paySuccess && (
                <div className="recep-form-banner recep-form-banner--success">
                  {paySuccess}
                </div>
              )}

              <div className="recep-form-group">
                <label className="login-form__label">Student</label>
                <select 
                  className="login-form__input" 
                  value={collectingStudent}
                  onChange={(e) => {
                    setCollectingStudent(e.target.value);
                    setPayError(null);
                    setPaySuccess(null);
                  }}
                  required
                >
                  <option value="">-- Select Student --</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.student_id})</option>
                  ))}
                </select>
              </div>

              <div className="recep-form-row">
                <div className="recep-form-group">
                  <label className="login-form__label">Amount (₹)</label>
                  <input 
                    type="number" 
                    className="login-form__input" 
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="Enter amount"
                    required
                  />
                </div>

                <div className="recep-form-group">
                  <label className="login-form__label">Payment Method</label>
                  <select 
                    className="login-form__input" 
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  >
                    <option value="Cash">Cash</option>
                    <option value="Card">Card</option>
                    <option value="Online">Online</option>
                  </select>
                </div>
              </div>

              <div className="recep-form-group">
                <label className="login-form__label">Payment Date</label>
                <input 
                  type="date" 
                  className="login-form__input" 
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  required
                />
              </div>

              <Button type="submit" variant="primary" fullWidth>
                Process Payment
              </Button>
            </form>
          </Card>

          <Card elevated>
            <h3 className="text-section-title recep-panel__title">Recent Transactions Ledger</h3>
            
            <div className="recep-transactions-scroll">
              <DataTable
                columns={[
                  { key: 'receipt_number', header: 'Receipt No', render: (p) => <strong>{p.receipt_number}</strong> },
                  { key: 'student_name', header: 'Student' },
                  { key: 'amount_paid', header: 'Amount', align: 'right', render: (p) => `₹${parseFloat(p.amount_paid).toLocaleString('en-IN')}` },
                  {
                    key: 'action',
                    header: 'Action',
                    align: 'center',
                    render: (p) => (
                      <Button variant="outline" size="sm" onClick={() => handleDownloadReceipt(p.id, p.receipt_number)}>
                        PDF
                      </Button>
                    ),
                  },
                ]}
                data={payments}
                rowKey="id"
                emptyMessage="No transactions recorded yet."
              />
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (currentView === 'tickets') {
    return (
      <div className="recep-view">
        <Card elevated className="recep-table-card">
          <div className="recep-panel__header">
            <div>
              <h3 className="text-section-title recep-panel__title">Examination Hall Ticket Approvals</h3>
              <span className="text-caption">Verify student dues and issue exam clearance.</span>
            </div>
          </div>

          <DataTable
            columns={[
              { key: 'student_id', header: 'Student ID', render: (s) => <strong>{s.student_id}</strong> },
              { key: 'name', header: 'Name' },
              { key: 'class_name', header: 'Class Number', render: (s) => <strong className="recep-class-cell">{s.class_name || s.class_id}</strong> },
              { key: 'annual_fee', header: 'Tuition Fee', align: 'right', render: (s) => `₹${parseFloat(s.annual_fee).toLocaleString('en-IN')}` },
              {
                key: 'status',
                header: 'Status',
                render: (s) => (
                  <span className={`recep-status-badge ${s.hall_ticket_approved ? 'recep-status-badge--approved' : 'recep-status-badge--pending'}`}>
                    {s.hall_ticket_approved ? 'Approved' : 'Dues Pending / Locked'}
                  </span>
                ),
              },
              {
                key: 'clearance',
                header: 'Hall Ticket Clearance',
                render: (s) =>
                  !s.hall_ticket_approved ? (
                    <Button variant="primary" size="sm" onClick={() => handleToggleHallTicket(s.id, true)}>
                      Approve exam
                    </Button>
                  ) : (
                    <Button variant="danger" size="sm" onClick={() => handleToggleHallTicket(s.id, false)}>
                      Revoke
                    </Button>
                  ),
              },
              {
                key: 'download',
                header: 'Download',
                render: (s) =>
                  s.hall_ticket_approved ? (
                    <Button variant="outline" size="sm" onClick={() => handleDownloadHallTicket(s.id)}>
                      Download PDF
                    </Button>
                  ) : (
                    <span className="text-caption">Locked</span>
                  ),
              },
            ]}
            data={students}
            rowKey="id"
            emptyMessage="No students found."
          />
        </Card>
      </div>
    );
  }

  return null;
};

export default ReceptionistDashboard;