import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Users, 
  DollarSign, 
  Award, 
  FileText, 
  Ticket, 
  Download 
} from 'lucide-react';

const ParentDashboard = () => {
  const { authenticatedFetch, API_URL } = useAuth();
  const [stats, setStats] = useState(null);
  const [selectedChild, setSelectedChild] = useState(null);
  const [childMarks, setChildMarks] = useState([]);

  const fetchParentStats = async () => {
    try {
      const res = await authenticatedFetch(`${API_URL}/api/dashboard/parent`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
        if (data.students && data.students.length > 0) {
          setSelectedChild(data.students[0]);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchChildMarks = async (studentId) => {
    try {
      const res = await authenticatedFetch(`${API_URL}/api/marks?student_id=${studentId}`);
      if (res.ok) {
        const data = await res.json();
        setChildMarks(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchParentStats();
  }, []);

  useEffect(() => {
    if (selectedChild) {
      fetchChildMarks(selectedChild.id);
    }
  }, [selectedChild]);

  const handleDownloadReportCard = (studentId) => {
    const token = localStorage.getItem('vis_token');
    window.open(`${API_URL}/api/pdf/report-card/${studentId}?token=${token}`, '_blank');
  };

  const handleDownloadHallTicket = (studentId) => {
    const token = localStorage.getItem('vis_token');
    window.open(`${API_URL}/api/pdf/hall-ticket/${studentId}?token=${token}`, '_blank');
  };

  if (!stats) {
    return (
      <div className="data-panel glass-panel" style={{ textAlign: 'center', padding: '32px' }}>
        Loading child records...
      </div>
    );
  }

  const childFee = selectedChild ? stats.fees_summary[selectedChild.id] : null;

  return (
    <div>
      {/* Sibling child selector */}
      <div className="glass-panel" style={{ padding: '16px', marginBottom: '24px', display: 'flex', gap: '16px', alignItems: 'center' }}>
        <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)' }}>Family ID: {stats.family_id} - Select Child:</span>
        <div style={{ display: 'flex', gap: '12px' }}>
          {stats.students.map(s => (
            <button 
              key={s.id} 
              className={`btn ${selectedChild?.id === s.id ? 'btn-primary' : 'btn-secondary'} btn-sm`}
              onClick={() => setSelectedChild(s)}
            >
              {s.name} ({s.student_class?.name || s.class_name})
            </button>
          ))}
        </div>
      </div>

      {selectedChild && (
        <div className="dashboard-grid">
          {/* Profile details and Fee stats */}
          <div>
            <div className="data-panel glass-panel" style={{ marginBottom: '24px' }}>
              <div className="panel-header">
                <h3 className="panel-title">Child Student Profile</h3>
              </div>
              
              <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
                <img 
                  src={selectedChild.photo_url || `https://api.dicebear.com/7.x/initials/svg?seed=${selectedChild.name}`} 
                  alt="Avatar" 
                  style={{ width: '80px', height: '80px', borderRadius: '12px', border: '2px solid var(--border-light)' }} 
                />
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', flexGrow: 1, fontSize: '13px' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Full Name:</span>
                    <p style={{ fontWeight: '600', marginTop: '2px' }}>{selectedChild.name}</p>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Student ID:</span>
                    <p style={{ fontWeight: '600', marginTop: '2px', color: 'var(--accent-cyan)' }}>{selectedChild.student_id}</p>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Admission Number:</span>
                    <p style={{ fontWeight: '600', marginTop: '2px' }}>{selectedChild.admission_number}</p>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Class:</span>
                    <p style={{ fontWeight: '600', marginTop: '2px' }}>{selectedChild.class_name}</p>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Date of Birth:</span>
                    <p style={{ fontWeight: '600', marginTop: '2px' }}>{selectedChild.date_of_birth}</p>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Gender:</span>
                    <p style={{ fontWeight: '600', marginTop: '2px' }}>{selectedChild.gender}</p>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Father's Name:</span>
                    <p style={{ fontWeight: '600', marginTop: '2px' }}>{selectedChild.father_name}</p>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Mother's Name:</span>
                    <p style={{ fontWeight: '600', marginTop: '2px' }}>{selectedChild.mother_name}</p>
                  </div>
                </div>
              </div>
              
              <div style={{ marginTop: '20px', padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', fontSize: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Bus Transport:</span>
                  <p style={{ fontWeight: '600', marginTop: '2px' }}>
                    {selectedChild.bus_route ? `Bus No ${selectedChild.bus_number} - ${selectedChild.bus_route}` : 'Not using school bus'}
                  </p>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Emergency Contact:</span>
                  <p style={{ fontWeight: '600', marginTop: '2px' }}>{selectedChild.emergency_contact}</p>
                </div>
              </div>
            </div>

            {/* Fee summary block */}
            <div className="data-panel glass-panel">
              <div className="panel-header">
                <h3 className="panel-title">Tuition Fee Ledger</h3>
              </div>
              
              {childFee && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', textAlign: 'center' }}>
                  <div className="glass-panel" style={{ padding: '16px', background: 'rgba(255,255,255,0.01)' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>ANNUAL FEE EXPECTED</div>
                    <strong style={{ fontSize: '18px' }}>₹{parseFloat(childFee.expected).toLocaleString('en-IN')}</strong>
                  </div>
                  <div className="glass-panel" style={{ padding: '16px', background: 'rgba(16, 185, 129, 0.05)' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>TOTAL PAID</div>
                    <strong style={{ fontSize: '18px', color: 'var(--accent-green)' }}>₹{parseFloat(childFee.paid).toLocaleString('en-IN')}</strong>
                  </div>
                  <div className="glass-panel" style={{ padding: '16px', background: 'rgba(239, 68, 68, 0.05)' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>PENDING DUE</div>
                    <strong style={{ fontSize: '18px', color: 'var(--accent-red)' }}>₹{parseFloat(childFee.pending).toLocaleString('en-IN')}</strong>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Academic Report and PDF Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="data-panel glass-panel" style={{ flexGrow: 1 }}>
              <div className="panel-header">
                <h3 className="panel-title">Academic Marks Sheet</h3>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '320px', overflowY: 'auto' }}>
                {childMarks.map(m => (
                  <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
                    <div>
                      <strong style={{ fontSize: '13px' }}>{m.subject}</strong>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{m.exam_type}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <strong style={{ color: 'var(--accent-cyan)' }}>{m.marks_obtained} / 100</strong>
                      <div style={{ fontSize: '9px', color: 'var(--accent-green)' }}>Approved</div>
                    </div>
                  </div>
                ))}
                {childMarks.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)', fontSize: '13px' }}>
                    No approved academic marks published yet.
                  </div>
                )}
              </div>
            </div>

            <div className="data-panel glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h3 className="panel-title">Document Downloads</h3>
              
              <button 
                onClick={() => handleDownloadReportCard(selectedChild.id)} 
                className="btn btn-primary"
                style={{ justifyContent: 'center' }}
                disabled={childMarks.length === 0}
              >
                <Download size={16} /> Download Report Card (PDF)
              </button>

              <button 
                onClick={() => handleDownloadHallTicket(selectedChild.id)} 
                className="btn btn-secondary"
                style={{ justifyContent: 'center' }}
                disabled={!selectedChild.hall_ticket_approved}
              >
                <Ticket size={16} /> Download Hall Ticket (PDF)
              </button>
              
              {!selectedChild.hall_ticket_approved && (
                <p style={{ fontSize: '10px', color: 'var(--accent-red)', textAlign: 'center' }}>
                  * Hall ticket is locked because fee payments are outstanding.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ParentDashboard;
