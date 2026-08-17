import { Link } from 'react-router-dom';
import { format, isPast, isToday, isTomorrow } from 'date-fns';
import { Calendar, MessageSquare, CheckSquare, AlertCircle } from 'lucide-react';

const PRIORITY_META = {
  high:   { label: 'High',   barColor: 'var(--color-priority-high)',   tagBg: '#FFE4E6', tagColor: '#9F1239' },
  medium: { label: 'Medium', barColor: 'var(--color-priority-medium)', tagBg: '#FEF3C7', tagColor: '#92400E' },
  low:    { label: 'Low',    barColor: 'var(--color-priority-low)',    tagBg: '#F1F5F9', tagColor: '#475569' },
};

const AVATAR_COLORS = [
  { bg: '#2563EB', color: '#FFFFFF' }, // Blue
  { bg: '#059669', color: '#FFFFFF' }, // Emerald
  { bg: '#7C3AED', color: '#FFFFFF' }, // Purple
  { bg: '#D97706', color: '#FFFFFF' }, // Amber
  { bg: '#DB2777', color: '#FFFFFF' }, // Pink
  { bg: '#4F46E5', color: '#FFFFFF' }, // Indigo
  { bg: '#0891B2', color: '#FFFFFF' }, // Cyan
  { bg: '#EA580C', color: '#FFFFFF' }, // Orange
];

function getAvatarStyle(name) {
  if (!name) return { background: '#94A3B8', color: '#FFFFFF' };
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return { background: AVATAR_COLORS[index].bg, color: AVATAR_COLORS[index].color };
}

export default function TaskCard({ task, projectId, isDragging }) {
  const isOverdue = task.dueDate && isPast(new Date(task.dueDate)) && !isToday(new Date(task.dueDate)) && task.status !== 'done';
  const isDueToday = task.dueDate && isToday(new Date(task.dueDate)) && task.status !== 'done';
  
  const prio = PRIORITY_META[task.priority] || PRIORITY_META.medium;
  const subtasksDone = task.subtasks?.filter(s => s.completed).length ?? 0;
  const subtasksTotal = task.subtasks?.length ?? 0;
  const subtaskPct = subtasksTotal > 0 ? Math.round((subtasksDone / subtasksTotal) * 100) : 0;

  const getInitials = (name) =>
    name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '?';

  return (
    <Link
      to={`/projects/${projectId}/tasks/${task._id}`}
      id={`task-card-${task._id}`}
      style={{
        display: 'block',
        textDecoration: 'none',
        background: 'var(--color-surface)',
        border: `1px solid ${isDragging ? 'var(--color-accent)' : 'var(--color-border)'}`,
        borderRadius: 'var(--radius-md)',
        padding: '12px 14px 12px 18px',
        transition: 'all 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
        boxShadow: isDragging ? 'var(--shadow-xl)' : 'var(--shadow-xs)',
        transform: isDragging ? 'rotate(2deg) scale(1.02)' : 'none',
        cursor: 'grab',
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={e => {
        if (!isDragging) {
          e.currentTarget.style.borderColor = 'var(--color-border-bright)';
          e.currentTarget.style.boxShadow = 'var(--shadow-md)';
          e.currentTarget.style.transform = 'translateY(-2px)';
        }
      }}
      onMouseLeave={e => {
        if (!isDragging) {
          e.currentTarget.style.borderColor = 'var(--color-border)';
          e.currentTarget.style.boxShadow = 'var(--shadow-xs)';
          e.currentTarget.style.transform = 'none';
        }
      }}
    >
      {/* Priority colored left-edge bar */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: '4px',
          background: prio.barColor,
          borderRadius: '4px 0 0 4px',
        }}
        title={`Priority: ${prio.label}`}
      />

      {/* Priority Dot + Text Tag */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '11px',
            fontWeight: 600,
            color: prio.tagColor,
            background: prio.tagBg,
            padding: '1.5px 6px',
            borderRadius: 'var(--radius-xs)',
          }}
        >
          <span className="priority-dot" style={{ width: '6px', height: '6px', background: prio.barColor }} />
          {prio.label}
        </span>
      </div>

      {/* Task Title */}
      <h3
        style={{
          margin: '0 0 6px 0',
          fontSize: '13.5px',
          fontWeight: 600,
          color: 'var(--color-text-primary)',
          lineHeight: 1.4,
          letterSpacing: '-0.005em',
        }}
      >
        {task.title}
      </h3>

      {/* Optional short description snippet */}
      {task.description && (
        <p
          style={{
            margin: '0 0 10px 0',
            fontSize: '12px',
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

      {/* Subtask progress bar + fraction badge */}
      {subtasksTotal > 0 && (
        <div style={{ margin: '8px 0 10px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
              <CheckSquare size={11} style={{ color: subtasksDone === subtasksTotal ? 'var(--color-status-done)' : 'var(--color-text-muted)' }} />
              Subtasks
            </span>
            <span
              style={{
                fontSize: '10.5px',
                fontWeight: 600,
                color: subtasksDone === subtasksTotal ? 'var(--color-status-done)' : 'var(--color-text-muted)',
                background: subtasksDone === subtasksTotal ? 'var(--color-status-done-bg)' : 'var(--color-surface-2)',
                padding: '1px 5px',
                borderRadius: 'var(--radius-xs)',
              }}
            >
              {subtasksDone}/{subtasksTotal}
            </span>
          </div>
          <div className="progress-track">
            <div
              className="progress-fill"
              style={{
                width: `${subtaskPct}%`,
                background: subtasksDone === subtasksTotal ? 'var(--color-status-done)' : 'var(--color-accent)',
              }}
            />
          </div>
        </div>
      )}

      {/* Footer row: Assignee avatar left, Comments + Due Date right */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px', paddingTop: '6px' }}>
        {/* Assignee Avatar with deterministic color */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {task.assignee ? (
            <div
              className="avatar"
              style={{
                width: '22px',
                height: '22px',
                fontSize: '9.5px',
                ...getAvatarStyle(task.assignee.name),
              }}
              title={`Assigned to ${task.assignee.name}`}
            >
              {getInitials(task.assignee.name)}
            </div>
          ) : (
            <div
              className="avatar"
              style={{ width: '22px', height: '22px', fontSize: '9.5px', background: '#E2E8F0', color: '#64748B' }}
              title="Unassigned"
            >
              ?
            </div>
          )}
        </div>

        {/* Right metadata badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Comment Count */}
          {task.commentsCount > 0 && (
            <span
              style={{
                fontSize: '11px',
                color: 'var(--color-text-secondary)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                fontWeight: 500,
              }}
              title={`${task.commentsCount} comments`}
            >
              <MessageSquare size={12} style={{ color: 'var(--color-text-muted)' }} />
              {task.commentsCount}
            </span>
          )}

          {/* Due Date Badge */}
          {task.dueDate && (() => {
            const dateObj = new Date(task.dueDate);
            const isTomorrowDate = isTomorrow(dateObj);
            const dueLabel = isOverdue
              ? 'Overdue'
              : isDueToday
              ? 'Due today'
              : isTomorrowDate
              ? 'Due tomorrow'
              : format(dateObj, 'MMM d');

            return (
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: isOverdue || isDueToday || isTomorrowDate ? 600 : 500,
                  color: isOverdue
                    ? 'var(--color-danger)'
                    : isDueToday
                    ? '#D97706'
                    : isTomorrowDate
                    ? '#2563EB'
                    : 'var(--color-text-secondary)',
                  background: isOverdue
                    ? 'var(--color-danger-subtle)'
                    : isDueToday
                    ? '#FEF3C7'
                    : isTomorrowDate
                    ? '#EFF6FF'
                    : 'var(--color-surface-2)',
                  padding: '2px 6px',
                  borderRadius: 'var(--radius-xs)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '3.5px',
                }}
                title={`Due date: ${format(dateObj, 'MMM d, yyyy')}`}
              >
                {isOverdue ? <AlertCircle size={11} /> : <Calendar size={11} />}
                {dueLabel}
              </span>
            );
          })()}
        </div>
      </div>
    </Link>
  );
}
