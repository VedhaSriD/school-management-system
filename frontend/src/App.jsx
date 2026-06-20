import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import {
  GraduationCap,
  Users,
  DollarSign,
  Award,
  Ticket,
  MessageSquare,
  LogOut,
  Menu,
  School
} from 'lucide-react';

import schoolLogo from "./assets/brand/school_pic.avif";

import AdminDashboard from './components/AdminDashboard';
import TeacherDashboard from './components/TeacherDashboard';
import ReceptionistDashboard from './components/ReceptionistDashboard';
import ParentDashboard from './components/ParentDashboard';

import './styles/LoginScreen.css';

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
        return (
          <div style={{ padding: '32px', color: 'var(--text-primary)' }}>
            Access Denied.
          </div>
        );
    }
  };

  const getNavItems = () => {
    switch (user?.role) {
      case 'Admin':
        return [
          { id: 'dashboard', label: 'Dashboard',      icon: GraduationCap },
          { id: 'students',  label: 'Students',        icon: Users },
          { id: 'marks',     label: 'Marks Approval',  icon: Award },
          { id: 'finance',   label: 'Finance',          icon: DollarSign },
          { id: 'assistant', label: 'VIS AI Assistant', icon: MessageSquare }
        ];
      case 'Teacher':
        return [
          { id: 'dashboard', label: 'Dashboard',   icon: GraduationCap },
          { id: 'students',  label: 'My Class',    icon: Users },
          { id: 'marks',     label: 'Marks Entry', icon: Award }
        ];
      case 'Receptionist':
        return [
          { id: 'dashboard', label: 'Dashboard',      icon: GraduationCap },
          { id: 'students',  label: 'Students',        icon: Users },
          { id: 'fees',      label: 'Fee Collection',  icon: DollarSign },
          { id: 'tickets',   label: 'Hall Tickets',    icon: Ticket }
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

      {/* ── Sidebar ── */}
      <aside className="sidebar" style={{ display: sidebarOpen ? 'flex' : 'none' }}>

        {/* Brand block with real school logo */}
        <div className="brand-section">
          <div className="brand-logo-badge">
            <img
  src={schoolLogo}
  alt="Vedha International School"
  style={{
    width: "150px",
    height: "150px",
    objectFit: "contain",
    border: "2px solid red"
  }}
/>
          </div>
          <div className="brand-info">
            <h1 className="brand-name">VEDHA</h1>
            <p className="brand-sub">INTERNATIONAL</p>
          </div>
        </div>

        {/* Navigation */}
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
        {/* User profile strip */}
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
            className="sidebar-logout-btn"
            title="Log Out"
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      {/* ── Main content area ── */}
      <main
        className="main-content"
        style={{
          marginLeft: sidebarOpen ? '260px' : '0px',
          transition: 'margin-left 0.25s ease'
        }}
      >
        {/* Top header bar */}
        <header className="top-header">
          <div className="top-header__left">
            <button
              className="sidebar-toggle-btn"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Toggle sidebar"
            >
              <Menu size={20} />
            </button>
            <div>
              <h2 className="page-title">Vedha International School</h2>
              <p className="page-subtitle">School Management Portal — Cloud ERP</p>
            </div>
          </div>

          <div className="top-header__badge">
            <School size={14} />
            <span>Academic Session: 2026-2027</span>
          </div>
        </header>

        {/* Role-based dashboard view */}
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
    <div className="login-page">

      {/* Left hero — school branding */}
      <div className="login-hero">
        <div className="login-hero__logo-frame">
          <img
            src={schoolLogo}
            alt="Vedha International School"
            className="login-hero__logo-img"
          />
        </div>
        <h1 className="login-hero__title">Vedha International School</h1>
        <p className="login-hero__subtitle">Cloud School Management Portal</p>
        <ul className="login-hero__points">
          <li>Unified dashboards for Admin, Teacher &amp; Receptionist</li>
          <li>Secure, role-based access control</li>
          <li>Real-time fee, attendance &amp; academic records</li>
        </ul>
      </div>

      {/* Right panel — login form */}
      <div className="login-panel">
        <div className="login-card">
          <div className="login-card__header">
            <h2 className="login-card__title">Sign In</h2>
            <p className="login-card__subtitle">Enter your credentials to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            {error && (
              <div className="login-form__error" role="alert">
                {error}
              </div>
            )}

            <div className="login-form__group">
              <label className="login-form__label" htmlFor="login-username">
                Username
              </label>
              <input
                id="login-username"
                type="text"
                className="login-form__input"
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
              />
            </div>

            <div className="login-form__group">
              <label className="login-form__label" htmlFor="login-password">
                Password
              </label>
              <input
                id="login-password"
                type="password"
                className="login-form__input"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              className="login-form__submit"
              disabled={loading}
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <p className="login-card__footnote">
            Vedha International School &middot; Academic Session 2026-2027
          </p>
        </div>
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