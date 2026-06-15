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
      <div>
        <div className="stats-grid">
          <div className="stat-card glass-panel accent-green">
            <div className="stat-info">
              <span className="stat-label">Collections Today</span>
              <span className="stat-val">₹{stats ? parseFloat(stats.total_payments_today).toLocaleString('en-IN') : '0'}</span>
            </div>
            <div className="stat-icon-wrapper"><DollarSign size={24} /></div>
          </div>

          <div className="stat-card glass-panel accent-cyan">
            <div className="stat-info">
              <span className="stat-label">Receipts Processed</span>
              <span className="stat-val">{stats?.total_payments_count_today || 0}</span>
            </div>
            <div className="stat-icon-wrapper"><FileText size={24} /></div>
          </div>

          <div className="stat-card glass-panel accent-amber">
            <div className="stat-info">
              <span className="stat-label">Pending Hall Tickets</span>
              <span className="stat-val">{stats?.pending_hall_ticket_approvals || 0}</span>
            </div>
            <div className="stat-icon-wrapper"><Ticket size={24} /></div>
          </div>
        </div>

        <div className="dashboard-grid">
          <div className="data-panel glass-panel">
            <div className="panel-header">
              <h3 className="panel-title">Recent Payments Feed</h3>
            </div>
            <div className="table-wrapper">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Receipt No</th>
                    <th>Student</th>
                    <th>Date</th>
                    <th>Method</th>
                    <th>Amount</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {stats?.recent_payments && stats.recent_payments.map((p) => (
                    <tr key={p.id}>
                      <td><strong style={{ color: 'var(--accent-cyan)' }}>{p.receipt_number}</strong></td>
                      <td>{p.student_name}</td>
                      <td>{p.payment_date}</td>
                      <td>{p.payment_method}</td>
                      <td>₹{parseFloat(p.amount_paid).toLocaleString('en-IN')}</td>
                      <td>
                        <button className="btn btn-secondary btn-sm" onClick={() => handleDownloadReceipt(p.id, p.receipt_number)}>
                          PDF
                        </button>
                      </td>
                    </tr>
                  ))}
                  {(!stats?.recent_payments || stats.recent_payments.length === 0) && (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)' }}>
                        No payments logged today yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="data-panel glass-panel">
            <div className="panel-header">
              <h3 className="panel-title">Quick Tasks</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
              <div style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                <strong>No Overlap Layouts</strong>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>All profile creations and billing logs are isolated in modals. Click any tab above to get started.</p>
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
            <h3 className="panel-title">Student Admissions Desk</h3>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Manage profile listings and new admissions.</span>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <input 
              type="text" 
              className="form-control" 
              placeholder="Search registry..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '240px', padding: '8px 12px' }}
            />
            <button className="btn btn-primary btn-sm" onClick={handleOpenAddModal}>
              <Plus size={16} /> New Student
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
                <th>Total Paid</th>
                <th>Pending Fee</th>
                <th>Father's Name</th>
                <th>Contact</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((s) => (
  <tr key={s.id}>
    <td>
      <strong style={{ color: 'var(--accent-cyan)' }}>
        {s.student_id}
      </strong>
    </td>

    <td>{s.admission_number}</td>

    <td>{s.name}</td>

    <td>{s.class_name}</td>

    <td>
      ₹{parseFloat(s.annual_fee).toLocaleString('en-IN')}
    </td>

    <td>
      ₹{parseFloat(s.total_paid || 0).toLocaleString('en-IN')}
    </td>

    <td
      style={{
        color: parseFloat(s.pending_fee || 0) > 0 ? '#ff6b6b' : '#51cf66',
        fontWeight: 'bold'
      }}
    >
      ₹{parseFloat(s.pending_fee || 0).toLocaleString('en-IN')}
    </td>

    <td>{s.father_name}</td>

    <td>{s.contact_number}</td>

    <td>
      <span className={`status-badge status-${s.status}`}>
        {s.status}
      </span>
    </td>

    <td>
      <button
        className="btn btn-secondary btn-sm"
        onClick={() => handleOpenEditModal(s)}
        style={{ padding: '6px' }}
        title="Edit"
      >
        <Edit size={14} />
      </button>
    </td>
  </tr>
))}
              {filteredStudents.length === 0 && (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    No student profiles found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* POPUP MODAL */}
        {showFormModal && (
          <div className="modal-overlay">
            <div className="modal-content glass-panel">
              <button className="modal-close" onClick={() => setShowFormModal(false)}>
                <X size={20} />
              </button>
              <h3 style={{ marginBottom: '24px', color: 'var(--accent-cyan)' }}>
                {editingStudent ? `Modify Student Details: ${editingStudent.student_id}` : 'Admit New Student'}
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
                  <label className="form-label">Address</label>
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

  if (currentView === 'fees') {
    return (
      <div className="dashboard-grid">
        <div className="data-panel glass-panel">
          <div className="panel-header">
            <h3 className="panel-title">Collect Tuition Fee</h3>
          </div>
          
          <form onSubmit={handleCollectPayment}>
            {payError && (
              <div className="status-badge status-inactive" style={{ width: '100%', marginBottom: '16px', padding: '8px', textAlign: 'center' }}>
                {payError}
              </div>
            )}
            {paySuccess && (
              <div className="status-badge status-active" style={{ width: '100%', marginBottom: '16px', padding: '8px', textAlign: 'center' }}>
                {paySuccess}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Student</label>
              <select 
                className="form-control" 
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

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Amount (₹)</label>
                <input 
                  type="number" 
                  className="form-control" 
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="Enter amount"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Payment Method</label>
                <select 
                  className="form-control" 
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  <option value="Cash">Cash</option>
                  <option value="Card">Card</option>
                  <option value="Online">Online</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Payment Date</label>
              <input 
                type="date" 
                className="form-control" 
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
              Process Payment
            </button>
          </form>
        </div>

        <div className="data-panel glass-panel">
          <div className="panel-header">
            <h3 className="panel-title">Recent Transactions Ledger</h3>
          </div>
          
          <div className="table-wrapper" style={{ maxHeight: '350px', overflowY: 'auto' }}>
            <table className="custom-table" style={{ fontSize: '12px' }}>
              <thead>
                <tr>
                  <th>Receipt No</th>
                  <th>Student</th>
                  <th>Amount</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {payments.map(p => (
                  <tr key={p.id}>
                    <td><strong>{p.receipt_number}</strong></td>
                    <td>{p.student_name}</td>
                    <td>₹{parseFloat(p.amount_paid).toLocaleString('en-IN')}</td>
                    <td>
                      <button className="btn btn-secondary btn-sm" onClick={() => handleDownloadReceipt(p.id, p.receipt_number)}>
                        PDF
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  if (currentView === 'tickets') {
    return (
      <div className="data-panel glass-panel">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">Examination Hall Ticket Approvals</h3>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Verify student dues and issue exam clearance.</span>
          </div>
        </div>

        <div className="table-wrapper">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Student ID</th>
                <th>Name</th>
                <th>Class Number</th>
                <th>Tuition Fee</th>
                <th>Status</th>
                <th>Hall Ticket Clearance</th>
                <th>Download</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => {
                // Determine balance (virtual calculations or we could fetch status for each - let's render standard toggles)
                // For simplicity, we can trust the database fields
                return (
                  <tr key={s.id}>
                    <td><strong>{s.student_id}</strong></td>
                    <td>{s.name}</td>
                    <td><strong style={{ color: 'var(--accent-purple)' }}>{s.class_name || s.class_id}</strong></td>
                    <td>₹{parseFloat(s.annual_fee).toLocaleString('en-IN')}</td>
                    <td>
                      <span className={`status-badge ${s.hall_ticket_approved ? 'status-approved' : 'status-pending'}`}>
                        {s.hall_ticket_approved ? 'Approved' : 'Dues Pending / Locked'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {!s.hall_ticket_approved ? (
                          <button className="btn btn-primary btn-sm" onClick={() => handleToggleHallTicket(s.id, true)}>
                            Approve exam
                          </button>
                        ) : (
                          <button className="btn btn-danger btn-sm" onClick={() => handleToggleHallTicket(s.id, false)}>
                            Revoke
                          </button>
                        )}
                      </div>
                    </td>
                    <td>
                      {s.hall_ticket_approved ? (
                        <button className="btn btn-secondary btn-sm" onClick={() => handleDownloadHallTicket(s.id)}>
                          Download PDF
                        </button>
                      ) : (
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Locked</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return null;
};

export default ReceptionistDashboard;
