import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';
import { LogOut, LayoutDashboard, Layers, Sparkles } from 'lucide-react';

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
        height: '52px',
        background: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        gap: '16px',
        flexShrink: 0,
        zIndex: 50,
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      {/* Brand logo */}
      <Link
        to="/"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          textDecoration: 'none',
          color: 'var(--color-text-primary)',
          fontWeight: 600,
          fontSize: '14.5px',
          letterSpacing: '-0.02em',
        }}
      >
        <span
          style={{
            width: '26px',
            height: '26px',
            background: 'linear-gradient(135deg, var(--color-accent), var(--color-accent-dim))',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '11px',
            fontWeight: 800,
            color: '#fff',
            fontFamily: 'var(--font-mono)',
            boxShadow: '0 2px 6px rgba(47,158,111,0.3)',
          }}
        >
          TF
        </span>
        <span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>TaskFlow</span>
        <span
          style={{
            fontSize: '9.5px',
            fontFamily: 'var(--font-mono)',
            padding: '1px 5px',
            borderRadius: 'var(--radius-xs)',
            background: 'var(--color-accent-subtle)',
            color: 'var(--color-accent)',
            fontWeight: 600,
            border: '1px solid rgba(47,158,111,0.2)',
          }}
        >
          TEAM
        </span>
      </Link>

      {/* Vertical separator */}
      <div style={{ width: '1px', height: '18px', background: 'var(--color-border)' }} />

      {/* Navigation items */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <Link
          to="/"
          className="btn"
          style={{
            background: isDashboardActive ? 'var(--color-surface-2)' : 'transparent',
            color: isDashboardActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
            border: isDashboardActive ? '1px solid var(--color-border-bright)' : '1px solid transparent',
            padding: '5px 10px',
            fontSize: '12px',
          }}
        >
          <LayoutDashboard size={14} style={{ color: isDashboardActive ? 'var(--color-accent)' : 'inherit' }} />
          Projects
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
          padding: '4px 8px 4px 4px',
          background: 'var(--color-surface-2)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-full)',
        }}
      >
        <div className="avatar avatar-accent" style={{ width: '24px', height: '24px', fontSize: '9.5px' }}>
          {initials}
        </div>
        <span
          style={{
            fontSize: '12px',
            fontWeight: 500,
            color: 'var(--color-text-primary)',
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
