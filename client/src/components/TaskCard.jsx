import { Link } from 'react-router-dom';
import { format, isPast, isToday } from 'date-fns';
import { AlertCircle, Calendar, MessageSquare, CheckSquare } from 'lucide-react';

const PRIORITY_TAGS = {
  high: { label: 'URGENT', bg: '#F5E1DF', color: '#B8453D' },
  medium: { label: 'DESIGN', bg: '#ECE4D0', color: '#7E6D3B' },
  low: { label: 'FEATURE', bg: '#E2E8D9', color: '#5B724D' },
};

export default function TaskCard({ task, projectId, isDragging }) {
  const isDueSoon     = task.dueDate && isToday(new Date(task.dueDate)) && task.status !== 'done';
  const isOverdue     = task.dueDate && isPast(new Date(task.dueDate)) && task.status !== 'done';
  const prio          = PRIORITY_TAGS[task.priority] || PRIORITY_TAGS.medium;
  const subtasksDone  = task.subtasks?.filter(s => s.completed).length ?? 0;
  const subtasksTotal = task.subtasks?.length ?? 0;
  const subtaskPct    = subtasksTotal > 0 ? Math.round((subtasksDone / subtasksTotal) * 100) : 0;

  const getInitials = (name) =>
    name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '?';

  return (
    <Link
      to={`/projects/${projectId}/tasks/${task._id}`}
      id={`task-card-${task._id}`}
      style={{
        display: 'block',
        textDecoration: 'none',
        background: '#FFFFFF',
        border: `1px solid ${isDragging ? 'var(--color-accent)' : '#E6E0D2'}`,
        borderRadius: '16px',
        padding: '16px',
        transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
        boxShadow: isDragging
          ? '0 12px 28px rgba(44, 41, 35, 0.12)'
          : '0 2px 8px rgba(44, 41, 35, 0.03)',
        transform: isDragging ? 'rotate(1.5deg) scale(1.02)' : 'none',
        cursor: 'grab',
        position: 'relative',
      }}
      onMouseEnter={e => {
        if (!isDragging) {
          e.currentTarget.style.borderColor = '#D6CEBC';
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 6px 16px rgba(44, 41, 35, 0.07)';
        }
      }}
      onMouseLeave={e => {
        if (!isDragging) {
          e.currentTarget.style.borderColor = '#E6E0D2';
          e.currentTarget.style.transform = 'none';
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(44, 41, 35, 0.03)';
        }
      }}
    >
      {/* Header row: Tag badge left, Date right */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <span
          style={{
            fontSize: '10px',
            fontFamily: 'var(--font-mono)',
            fontWeight: 700,
            color: prio.color,
            background: prio.bg,
            padding: '3px 8px',
            borderRadius: '6px',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          {prio.label}
        </span>

        {task.dueDate ? (
          <span
            style={{
              fontSize: '11px',
              fontFamily: 'var(--font-serif)',
              fontStyle: 'italic',
              color: isOverdue ? 'var(--color-danger)' : 'var(--color-text-muted)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            {isOverdue && <AlertCircle size={10} />}
            {format(new Date(task.dueDate), 'MMM d')}
          </span>
        ) : (
          <span style={{ fontSize: '11px', fontFamily: 'var(--font-serif)', fontStyle: 'italic', color: 'var(--color-text-muted)' }}>
            {task.status === 'inprogress' ? 'Active' : 'Pending'}
          </span>
        )}
      </div>

      {/* Task Title (Serif) */}
      <h3
        style={{
          margin: '0 0 8px 0',
          fontSize: '14.5px',
          fontWeight: 600,
          fontFamily: 'var(--font-serif)',
          color: 'var(--color-text-primary)',
          lineHeight: 1.35,
          letterSpacing: '-0.01em',
        }}
      >
        {task.title}
      </h3>

      {/* Optional description snippet if present */}
      {task.description && (
        <p
          style={{
            margin: '0 0 12px 0',
            fontSize: '11.5px',
            color: 'var(--color-text-secondary)',
            lineHeight: 1.45,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {task.description}
        </p>
      )}

      {/* Subtasks Progress Bar (matching reference mockup) */}
      {subtasksTotal > 0 && (
        <div style={{ margin: '10px 0 12px 0' }}>
          <div className="progress-track" style={{ background: '#EAE5D8', height: '6px', borderRadius: '3px' }}>
            <div
              className="progress-fill"
              style={{
                width: `${subtaskPct}%`,
                background: subtaskPct === 100 ? '#5F8F67' : '#8A9054',
                height: '100%',
                borderRadius: '3px',
              }}
            />
          </div>
          <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--color-text-muted)', marginTop: '4px', display: 'block' }}>
            {subtaskPct}% COMPLETE
          </span>
        </div>
      )}

      {/* Footer row: Assignee circular overlap avatar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '-4px' }}>
          {task.assignee ? (
            <div
              className="avatar avatar-accent"
              style={{ width: '26px', height: '26px', fontSize: '9.5px', boxShadow: '0 0 0 2px #FFF' }}
              title={`Assigned to ${task.assignee.name}`}
            >
              {getInitials(task.assignee.name)}
            </div>
          ) : (
            <div
              className="avatar"
              style={{ width: '26px', height: '26px', fontSize: '9.5px', background: '#ECE7DB', boxShadow: '0 0 0 2px #FFF' }}
              title="Unassigned"
            >
              ?
            </div>
          )}
        </div>

        {task.commentsCount > 0 && (
          <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <MessageSquare size={11} /> {task.commentsCount}
          </span>
        )}
      </div>
    </Link>
  );
}
