import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, CheckCheck, Inbox } from 'lucide-react';
import api from '../api/axios';
import { formatDistanceToNow } from 'date-fns';

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState({ notifications: [], unreadCount: 0 });
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      setData(res.data);
    } catch {
      // Silently fail
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setData((prev) => ({
        notifications: prev.notifications.map((n) => (n._id === id ? { ...n, read: true } : n)),
        unreadCount: Math.max(0, prev.unreadCount - 1),
      }));
    } catch {}
  };

  const markAllRead = async () => {
    try {
      await api.patch('/notifications/all/read');
      setData((prev) => ({
        notifications: prev.notifications.map((n) => ({ ...n, read: true })),
        unreadCount: 0,
      }));
    } catch {}
  };

  const handleClick = (notification) => {
    if (!notification.read) markRead(notification._id);
    if (notification.link) {
      navigate(notification.link);
      setOpen(false);
    }
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <button
        id="btn-notifications"
        onClick={() => setOpen((o) => !o)}
        className="btn-icon"
        style={{
          position: 'relative',
          background: open ? 'var(--color-surface-2)' : 'transparent',
          color: open ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
        }}
        aria-label={`Notifications${data.unreadCount > 0 ? ` (${data.unreadCount} unread)` : ''}`}
      >
        <Bell size={16} />
        {data.unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '4px',
              right: '4px',
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: 'var(--color-accent)',
              boxShadow: '0 0 8px var(--color-accent)',
            }}
            className="animate-pulse-dot"
          />
        )}
      </button>

      {open && (
        <div
          className="animate-slide-down"
          style={{
            position: 'absolute',
            top: 'calc(100% + 10px)',
            right: 0,
            width: '360px',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border-bright)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-xl)',
            zIndex: 100,
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              borderBottom: '1px solid var(--color-border)',
              background: 'var(--color-surface-2)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                Notifications
              </span>
              {data.unreadCount > 0 && (
                <span className="badge badge-accent">
                  {data.unreadCount} unread
                </span>
              )}
            </div>
            {data.unreadCount > 0 && (
              <button
                onClick={markAllRead}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--color-accent)',
                  fontSize: '11.5px',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '2px 6px',
                  borderRadius: 'var(--radius-xs)',
                }}
              >
                <CheckCheck size={13} />
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ maxHeight: '340px', overflowY: 'auto' }}>
            {data.notifications.length === 0 ? (
              <div
                style={{
                  padding: '36px 20px',
                  textAlign: 'center',
                  color: 'var(--color-text-muted)',
                }}
              >
                <Inbox size={28} style={{ margin: '0 auto 10px', opacity: 0.3, display: 'block' }} />
                <p style={{ margin: 0, fontSize: '12.5px', fontWeight: 500, color: 'var(--color-text-secondary)' }}>
                  All clear
                </p>
                <p style={{ margin: '4px 0 0', fontSize: '11.5px', color: 'var(--color-text-muted)' }}>
                  No unread task updates or mentions.
                </p>
              </div>
            ) : (
              data.notifications.map((n) => (
                <div
                  key={n._id}
                  onClick={() => handleClick(n)}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    padding: '11px 16px',
                    cursor: n.link ? 'pointer' : 'default',
                    background: n.read ? 'transparent' : 'rgba(47, 158, 111, 0.04)',
                    borderBottom: '1px solid var(--color-border-subtle)',
                    transition: 'background 0.12s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (n.link) e.currentTarget.style.background = 'var(--color-surface-2)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = n.read ? 'transparent' : 'rgba(47, 158, 111, 0.04)';
                  }}
                >
                  <div style={{ marginTop: '5px', flexShrink: 0, width: '6px' }}>
                    {!n.read && (
                      <div
                        style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          background: 'var(--color-accent)',
                          boxShadow: '0 0 6px var(--color-accent)',
                        }}
                      />
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--color-text-primary)', lineHeight: 1.45 }}>
                      {n.message}
                    </p>
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '10px',
                        color: 'var(--color-text-muted)',
                        display: 'block',
                        marginTop: '4px',
                      }}
                    >
                      {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  {!n.read && (
                    <button
                      onClick={(e) => { e.stopPropagation(); markRead(n._id); }}
                      title="Mark as read"
                      className="btn-icon"
                      style={{ padding: '3px', marginTop: '2px' }}
                    >
                      <Check size={13} />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
