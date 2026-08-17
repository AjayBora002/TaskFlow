import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';
import { LogOut, LayoutDashboard } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  const isDashboardActive = location.pathname === '/';

  return (
    <header
      style={{
        height: '56px',
        background: '#F4F1EA',
        borderBottom: '1px solid #E2DCD0',
        display: 'flex',
        alignItems: 'center',
        padding: '0 24px',
        gap: '16px',
        flexShrink: 0,
        zIndex: 50,
      }}
    >
      {/* Brand logo */}
      <Link
        to="/"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          textDecoration: 'none',
          color: '#2C2923',
        }}
      >
        <span
          style={{
            width: '28px',
            height: '28px',
            background: '#8A9054',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            fontWeight: 800,
            color: '#FFF',
            fontFamily: 'var(--font-mono)',
          }}
        >
          T
        </span>
        <span style={{ fontWeight: 700, fontSize: '16px', fontFamily: 'var(--font-serif)', letterSpacing: '-0.01em' }}>
          TaskFlow
        </span>
      </Link>

      {/* Vertical separator */}
      <div style={{ width: '1px', height: '18px', background: '#E2DCD0' }} />

      {/* Navigation items */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <Link
          to="/"
          className="btn"
          style={{
            background: isDashboardActive ? '#EDE8DE' : 'transparent',
            color: isDashboardActive ? '#2C2923' : '#6B6557',
            border: isDashboardActive ? '1px solid #D6CEBC' : '1px solid transparent',
            padding: '6px 12px',
            fontSize: '13px',
            borderRadius: '8px',
          }}
        >
          <LayoutDashboard size={14} style={{ color: isDashboardActive ? '#8A9054' : 'inherit' }} />
          Dashboard
        </Link>
      </nav>

      <div style={{ flex: 1 }} />

      {/* Notification Bell */}
      <NotificationBell />

      {/* User info pill */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '4px 10px 4px 4px',
          background: '#EDE8DE',
          border: '1px solid #E2DCD0',
          borderRadius: '20px',
        }}
      >
        <div className="avatar avatar-accent" style={{ width: '24px', height: '24px', fontSize: '9px' }}>
          {initials}
        </div>
        <span
          style={{
            fontSize: '12.5px',
            fontWeight: 600,
            color: '#2C2923',
            maxWidth: '120px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {user?.name}
        </span>
      </div>

      {/* Sign out button */}
      <button
        id="btn-logout"
        onClick={handleLogout}
        className="btn-icon"
        title="Sign out"
      >
        <LogOut size={16} />
      </button>
    </header>
  );
}
