import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { 
  GraduationCap, 
  Users, 
  DollarSign, 
  Award, 
  FileText, 
  Ticket, 
  MessageSquare, 
  LogOut, 
  Menu, 
  X, 
  School 
} from 'lucide-react';

// Import dashboards
import AdminDashboard from './components/AdminDashboard';
import TeacherDashboard from './components/TeacherDashboard';
import ReceptionistDashboard from './components/ReceptionistDashboard';
import ParentDashboard from './components/ParentDashboard';

const DashboardContent = () => {
  const { user, logout } = useAuth();
  const [currentView, setCurrentView] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const renderDashboard = () => {
    switch (user?.role) {
      case 'Admin':
        return <AdminDashboard currentView={currentView} />;
      case 'Teacher':
        return <TeacherDashboard currentView={currentView} />;
      case 'Receptionist':
        return <ReceptionistDashboard currentView={currentView} />;
      case 'Parent':
        return <ParentDashboard currentView={currentView} />;
      default:
        return <div>Access Denied.</div>;
    }
  };

  const getNavItems = () => {
    switch (user?.role) {
      case 'Admin':
        return [
          { id: 'dashboard', label: 'Dashboard', icon: GraduationCap },
          { id: 'students', label: 'Students', icon: Users },
          { id: 'marks', label: 'Marks Approval', icon: Award },
          { id: 'assistant', label: 'VIS AI Assistant', icon: MessageSquare }
        ];
      case 'Teacher':
        return [
          { id: 'dashboard', label: 'Dashboard', icon: GraduationCap },
          { id: 'students', label: 'My Class', icon: Users },
          { id: 'marks', label: 'Marks Entry', icon: Award }
        ];
      case 'Receptionist':
        return [
          { id: 'dashboard', label: 'Dashboard', icon: GraduationCap },
          { id: 'students', label: 'Students', icon: Users },
          { id: 'fees', label: 'Fee Collection', icon: DollarSign },
          { id: 'tickets', label: 'Hall Tickets', icon: Ticket }
        ];
      case 'Parent':
        return [
          { id: 'dashboard', label: 'Dashboard', icon: GraduationCap }
        ];
      default:
        return [];
    }
  };

  const navItems = getNavItems();

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? '' : 'collapsed'}`} style={{ display: sidebarOpen ? 'flex' : 'none' }}>
        <div className="brand-section">
          <div className="brand-logo">VIS</div>
          <div className="brand-info">
            <h1 className="brand-name">VEDHA</h1>
            <p className="brand-sub">INTERNATIONAL</p>
          </div>
        </div>

        <nav className="nav-menu">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <a
                key={item.id}
                className={`nav-item ${currentView === item.id ? 'active' : ''}`}
                onClick={() => setCurrentView(item.id)}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </a>
            );
          })}
        </nav>

        <div className="user-profile-bar">
          <img 
            className="user-avatar" 
            src={`https://api.dicebear.com/7.x/initials/svg?seed=${user?.name}`} 
            alt="avatar" 
          />
          <div className="user-info">
            <h4 className="user-name">{user?.name}</h4>
            <span className="user-role">{user?.role}</span>
          </div>
          <button 
            onClick={logout} 
            className="modal-close" 
            style={{ position: 'relative', top: 0, right: 0 }}
            title="Log Out"
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      {/* Main Content Pane */}
      <main className="main-content" style={{ marginLeft: sidebarOpen ? '260px' : '0px', transition: 'margin-left 0.3s' }}>
        {/* Top Header */}
        <header className="top-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button 
              className="btn btn-secondary btn-sm"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              style={{ padding: '8px' }}
            >
              <Menu size={18} />
            </button>
            <div>
              <h2 className="page-title">Vedha International School</h2>
              <p className="page-subtitle">School Management Portal - Cloud ERP</p>
            </div>
          </div>
          <div className="glass-panel" style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <School size={16} className="text-accent" style={{ color: 'var(--accent-cyan)' }} />
            <span style={{ fontSize: '12px', fontWeight: '600' }}>Academic Session: 2026-2027</span>
          </div>
        </header>

        {/* Dynamic View Body */}
        {renderDashboard()}
      </main>
    </div>
  );
};

const LoginScreen = () => {
  const { login, loading, error } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) return;
    try {
      await login(username, password);
    } catch (err) {
      // Error handled by AuthContext
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-card glass-panel">
        <div className="login-header">
          <div className="brand-logo" style={{ margin: '0 auto 16px auto', width: '50px', height: '50px', fontSize: '24px' }}>VIS</div>
          <h2 className="login-title">Vedha International</h2>
          <p className="login-subtitle">Cloud School Management System</p>
        </div>

        <form onSubmit={handleSubmit}>
          {error && (
            <div className="status-badge status-inactive" style={{ width: '100%', marginBottom: '16px', textAlign: 'center', padding: '8px' }}>
              {error}
            </div>
          )}
          <div className="form-group" style={{ textAlign: 'left' }}>
            <label className="form-label">Username</label>
            <input 
              type="text" 
              className="form-control" 
              placeholder="Enter username" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="form-group" style={{ textAlign: 'left' }}>
            <label className="form-label">Password</label>
            <input 
              type="password" 
              className="form-control" 
              placeholder="Enter password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', marginTop: '8px', justifyContent: 'center' }}
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};

const AppMain = () => {
  const { token } = useAuth();
  return token ? <DashboardContent /> : <LoginScreen />;
};

function App() {
  return (
    <AuthProvider>
      <AppMain />
    </AuthProvider>
  );
}

export default App;
