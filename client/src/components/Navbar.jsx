import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';
import { LogOut, LayoutDashboard, Sparkles } from 'lucide-react';

const AVATAR_COLORS = [
  { bg: '#2563EB', color: '#FFFFFF' },
  { bg: '#059669', color: '#FFFFFF' },
  { bg: '#7C3AED', color: '#FFFFFF' },
  { bg: '#D97706', color: '#FFFFFF' },
  { bg: '#DB2777', color: '#FFFFFF' },
  { bg: '#4F46E5', color: '#FFFFFF' },
];

function getAvatarStyle(name) {
  if (!name) return { background: '#4F46E5', color: '#FFFFFF' };
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return { background: AVATAR_COLORS[index].bg, color: AVATAR_COLORS[index].color };
}

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
    : 'TF';

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
        boxShadow: 'var(--shadow-xs)',
      }}
    >
      {/* Brand logo */}
      <Link
        to="/"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '9px',
          textDecoration: 'none',
          color: 'var(--color-text-primary)',
        }}
      >
        <span
          style={{
            width: '28px',
            height: '28px',
            background: 'linear-gradient(135deg, #4F46E5 0%, #3730A3 100%)',
            borderRadius: 'var(--radius-xs)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            fontWeight: 800,
            color: '#FFFFFF',
            boxShadow: '0 2px 6px rgba(79, 70, 229, 0.3)',
          }}
        >
          TF
        </span>
        <span
          className="font-display"
          style={{
            fontWeight: 800,
            fontSize: '16px',
            color: 'var(--color-text-primary)',
            letterSpacing: '-0.02em',
          }}
        >
          TaskFlow
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
            border: isDashboardActive ? '1px solid var(--color-border)' : '1px solid transparent',
            padding: '5px 10px',
            fontSize: '13px',
            fontWeight: isDashboardActive ? 600 : 500,
          }}
        >
          <LayoutDashboard size={14} style={{ color: isDashboardActive ? 'var(--color-accent)' : 'inherit' }} />
          Dashboard
        </Link>
      </nav>

      <div style={{ flex: 1 }} />

      {/* Notification Bell with pulse dot */}
      <NotificationBell />

      {/* User profile pill */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '3px 10px 3px 3px',
          background: 'var(--color-surface-2)',
          border: '1px solid var(--color-border)',
          borderRadius: '20px',
        }}
      >
        <div
          className="avatar"
          style={{
            width: '24px',
            height: '24px',
            fontSize: '9.5px',
            boxShadow: 'none',
            ...getAvatarStyle(user?.name),
          }}
        >
          {initials}
        </div>
        <span
          style={{
            fontSize: '12.5px',
            fontWeight: 600,
            color: 'var(--color-text-primary)',
            maxWidth: '130px',
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
