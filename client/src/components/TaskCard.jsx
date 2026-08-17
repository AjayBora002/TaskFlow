import { Link } from 'react-router-dom';
import { format, isPast, isToday } from 'date-fns';
import { AlertCircle, Calendar, MessageSquare } from 'lucide-react';

export default function TaskCard({ task, projectId, isDragging }) {
  const isDueSoon = task.dueDate && isToday(new Date(task.dueDate)) && task.status !== 'done';
  const isActuallyOverdue = task.dueDate && isPast(new Date(task.dueDate)) && task.status !== 'done';

  const getInitials = (name) =>
    name ? name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) : '?';

  return (
    <Link
      to={`/projects/${projectId}/tasks/${task._id}`}
      id={`task-card-${task._id}`}
      style={{
        display: 'flex',
        textDecoration: 'none',
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        transition: 'all 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
        boxShadow: isDragging ? 'var(--shadow-xl)' : 'var(--shadow-sm)',
        transform: isDragging ? 'rotate(1.5deg) scale(1.02)' : 'none',
        borderColor: isDragging ? 'var(--color-accent)' : 'var(--color-border)',
        cursor: 'grab',
      }}
      onMouseEnter={(e) => {
        if (!isDragging) {
          e.currentTarget.style.borderColor = 'var(--color-border-bright)';
          e.currentTarget.style.boxShadow = 'var(--shadow-md)';
          e.currentTarget.style.transform = 'translateY(-1px)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isDragging) {
          e.currentTarget.style.borderColor = 'var(--color-border)';
          e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
          e.currentTarget.style.transform = 'none';
        }
      }}
    >
      {/* Signature detail: 3px left status stripe */}
      <div className={`status-stripe status-stripe-${task.status}`} />

      <div style={{ flex: 1, padding: '11px 13px', minWidth: 0 }}>
        {/* Header row: Priority dot & Task Title */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
          <span
            className={`priority-dot priority-${task.priority}`}
            style={{ marginTop: '5px' }}
            title={`Priority: ${task.priority}`}
          />
          <p
            style={{
              margin: 0,
              fontSize: '13px',
              fontWeight: 500,
              color: 'var(--color-text-primary)',
              lineHeight: 1.4,
              wordBreak: 'break-word',
              letterSpacing: '-0.01em',
            }}
          >
            {task.title}
          </p>
        </div>

        {/* Footer row: Assignee Avatar & Due Date */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px', paddingTop: '8px', borderTop: '1px solid var(--color-border-subtle)' }}>
          {/* Due date */}
          {task.dueDate ? (
            <span
              style={{
                fontSize: '10.5px',
                fontFamily: 'var(--font-mono)',
                color: isActuallyOverdue
                  ? 'var(--color-danger)'
                  : isDueSoon
                  ? 'var(--color-priority-medium)'
                  : 'var(--color-text-muted)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                background: isActuallyOverdue
                  ? 'var(--color-danger-subtle)'
                  : 'var(--color-surface-2)',
                padding: '2px 6px',
                borderRadius: 'var(--radius-xs)',
                border: isActuallyOverdue ? '1px solid rgba(224, 82, 82, 0.25)' : '1px solid transparent',
              }}
            >
              {isActuallyOverdue ? <AlertCircle size={10} /> : <Calendar size={10} />}
              {format(new Date(task.dueDate), 'MMM d')}
            </span>
          ) : (
            <span style={{ fontSize: '10.5px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
              {task.subtasks?.length > 0
                ? `${task.subtasks.filter((s) => s.completed).length}/${task.subtasks.length} subtasks`
                : 'No due date'}
            </span>
          )}

          {/* Assignee Avatar */}
          {task.assignee ? (
            <div
              className="avatar avatar-accent"
              style={{ width: '22px', height: '22px', fontSize: '8.5px' }}
              title={`Assigned to ${task.assignee.name}`}
            >
              {getInitials(task.assignee.name)}
            </div>
          ) : (
            <div
              className="avatar"
              style={{ width: '22px', height: '22px', fontSize: '8.5px', opacity: 0.6 }}
              title="Unassigned"
            >
              ?
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
