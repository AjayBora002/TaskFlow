import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';
import { ArrowLeft, Trash2, ChevronRight, Save, X, Calendar, Sparkles, Loader2, Activity } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import CommentThread from '../components/CommentThread';
import SubtaskDecomposer from '../components/SubtaskDecomposer';

const STATUSES = [
  { id: 'todo', label: 'To Do' },
  { id: 'inprogress', label: 'In Progress' },
  { id: 'inreview', label: 'In Review' },
  { id: 'done', label: 'Done' },
];

const PRIORITIES = ['low', 'medium', 'high'];

const AVATAR_COLORS = [
  { bg: '#2563EB', color: '#FFFFFF' },
  { bg: '#059669', color: '#FFFFFF' },
  { bg: '#7C3AED', color: '#FFFFFF' },
  { bg: '#D97706', color: '#FFFFFF' },
  { bg: '#DB2777', color: '#FFFFFF' },
  { bg: '#4F46E5', color: '#FFFFFF' },
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

export default function TaskDetail() {
  const { projectId, taskId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [task, setTask] = useState(null);
  const [project, setProject] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saveError, setSaveError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [generatingSpec, setGeneratingSpec] = useState(false);

  const handleGenerateSpec = async () => {
    setGeneratingSpec(true);
    try {
      const res = await api.post('/ai/generate-spec', {
        title: task.title,
        brief: task.description,
      });
      const updatedDesc = task.description
        ? `${task.description}\n\n${res.data.spec}`
        : res.data.spec;
      const saveRes = await api.put(`/projects/${projectId}/tasks/${taskId}`, {
        description: updatedDesc,
      });
      setTask(saveRes.data);
      setEditForm((f) => ({ ...f, description: updatedDesc }));
    } catch (err) {
      console.error('Spec generation error:', err);
    } finally {
      setGeneratingSpec(false);
    }
  };

  useEffect(() => {
    fetchTask();
  }, [taskId]);

  const fetchTask = async () => {
    try {
      const [taskRes, commentsRes, projRes] = await Promise.all([
        api.get(`/projects/${projectId}/tasks/${taskId}`),
        api.get(`/projects/${projectId}/tasks/${taskId}/comments`),
        api.get(`/projects/${projectId}`),
      ]);
      setTask(taskRes.data);
      setComments(commentsRes.data);
      setProject(projRes.data);
      setEditForm({
        title: taskRes.data.title,
        description: taskRes.data.description || '',
        status: taskRes.data.status,
        priority: taskRes.data.priority,
        assignee: taskRes.data.assignee?._id || '',
        dueDate: taskRes.data.dueDate ? format(new Date(taskRes.data.dueDate), 'yyyy-MM-dd') : '',
      });
    } catch (err) {
      if (err.response?.status === 404 || err.response?.status === 403) {
        navigate(`/projects/${projectId}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError('');
    try {
      const payload = {
        ...editForm,
        assignee: editForm.assignee || null,
        dueDate: editForm.dueDate || null,
      };
      const res = await api.put(`/projects/${projectId}/tasks/${taskId}`, payload);
      setTask(res.data);
      setEditing(false);
    } catch (err) {
      setSaveError(err.response?.data?.message || 'Failed to save task');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/projects/${projectId}/tasks/${taskId}`);
      navigate(`/projects/${projectId}`);
    } catch (err) {
      console.error('Delete task error:', err);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
        <div className="skeleton" style={{ height: '20px', width: '160px', marginBottom: '16px' }} />
        <div className="skeleton" style={{ height: '32px', width: '100%', marginBottom: '20px' }} />
        <div className="skeleton" style={{ height: '200px', width: '100%' }} />
      </div>
    );
  }

  if (!task) return null;

  // Build reverse-chronological activity feed entries from existing task & comment data
  const activityItems = [];
  if (task.createdAt) {
    activityItems.push({
      id: 'create',
      text: 'Task created',
      timestamp: new Date(task.createdAt),
      color: 'var(--color-accent)',
    });
  }
  if (task.updatedAt && task.updatedAt !== task.createdAt) {
    const statusLabel = STATUSES.find((s) => s.id === task.status)?.label || task.status;
    activityItems.push({
      id: 'update',
      text: `Status updated to "${statusLabel}"`,
      timestamp: new Date(task.updatedAt),
      color: 'var(--color-status-inprogress)',
    });
  }
  if (comments && comments.length > 0) {
    comments.forEach((c) => {
      activityItems.push({
        id: `comment-${c._id}`,
        text: `Comment added by ${c.author?.name || 'Teammate'}`,
        timestamp: new Date(c.createdAt),
        color: '#7C3AED',
      });
    });
  }
  if (task.subtasks && task.subtasks.length > 0) {
    const doneCount = task.subtasks.filter((s) => s.completed).length;
    activityItems.push({
      id: 'subtasks',
      text: `Checklist progress (${doneCount}/${task.subtasks.length})`,
      timestamp: new Date(task.updatedAt || task.createdAt),
      color: 'var(--color-status-done)',
    });
  }
  activityItems.sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div style={{ height: '100%', overflowY: 'auto', background: 'var(--color-base)', padding: '24px 20px' }}>
      {/* Centered Max-Width Container */}
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          gap: '20px',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
        }}
        className="animate-fade-in"
      >
        {/* Column 1: Main Task Details Area */}
        <div style={{ flex: '1 1 500px', minWidth: '320px' }}>
          {/* Navigation Breadcrumb */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginBottom: '16px',
              fontSize: '12.5px',
              color: 'var(--color-text-muted)',
            }}
          >
            <Link
              to={`/projects/${projectId}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                color: 'var(--color-text-secondary)',
                textDecoration: 'none',
                fontWeight: 600,
              }}
            >
              <ArrowLeft size={13} />
              {project?.name}
            </Link>
            <ChevronRight size={12} />
            <span style={{ color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {task.title}
            </span>
          </div>

          {/* Title Header */}
          <div style={{ marginBottom: '18px' }}>
            {editing ? (
              <input
                id="task-title-edit"
                value={editForm.title}
                onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                className="input"
                style={{ fontSize: '18px', fontWeight: 700, padding: '6px 10px' }}
              />
            ) : (
              <h1
                className="font-display"
                style={{
                  margin: 0,
                  fontSize: '22px',
                  fontWeight: 800,
                  color: 'var(--color-text-primary)',
                  lineHeight: 1.3,
                  letterSpacing: '-0.025em',
                }}
              >
                {task.title}
              </h1>
            )}
          </div>

          {/* Action Toolbar */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
            {!editing ? (
              <>
                <button
                  id="btn-edit-task"
                  onClick={() => setEditing(true)}
                  className="btn btn-ghost"
                >
                  Edit Task
                </button>
                <button
                  onClick={handleGenerateSpec}
                  disabled={generatingSpec}
                  className="btn btn-ghost"
                  style={{ gap: '5px' }}
                >
                  {generatingSpec ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} style={{ color: 'var(--color-accent)' }} />}
                  {generatingSpec ? 'Generating Spec...' : 'AI Generate Spec'}
                </button>
                {!deleteConfirm ? (
                  <button
                    id="btn-delete-task"
                    onClick={() => setDeleteConfirm(true)}
                    className="btn btn-danger"
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--color-danger)', fontWeight: 600 }}>Confirm deletion?</span>
                    <button
                      id="btn-confirm-delete"
                      onClick={handleDelete}
                      className="btn btn-danger"
                    >
                      Yes, delete
                    </button>
                    <button onClick={() => setDeleteConfirm(false)} className="btn btn-ghost">Cancel</button>
                  </div>
                )}
              </>
            ) : (
              <>
                <button
                  id="btn-save-task"
                  onClick={handleSave}
                  disabled={saving}
                  className="btn btn-primary"
                >
                  <Save size={14} />
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={() => { setEditing(false); setSaveError(''); }}
                  className="btn btn-ghost"
                >
                  <X size={14} />
                  Cancel
                </button>
              </>
            )}
          </div>

          {saveError && (
            <p style={{ margin: '-12px 0 20px', fontSize: '12px', color: 'var(--color-danger)' }}>{saveError}</p>
          )}

          {/* Task Description */}
          <div className="card" style={{ padding: '20px', background: 'var(--color-surface)', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <label className="field-label" style={{ margin: 0 }}>Description</label>
            </div>
            {editing ? (
              <textarea
                id="task-desc-edit"
                rows={6}
                value={editForm.description}
                onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Add comprehensive task requirements, documentation, or links..."
                className="input"
                style={{ resize: 'vertical', lineHeight: 1.6 }}
              />
            ) : task.description ? (
              <p style={{ margin: 0, fontSize: '13.5px', color: 'var(--color-text-primary)', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
                {task.description}
              </p>
            ) : (
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                No description provided. Click "Edit Task" or "AI Generate Spec" to add context.
              </p>
            )}
          </div>

          {/* Subtask & Checklist Decomposer */}
          <SubtaskDecomposer
            taskId={taskId}
            projectId={projectId}
            subtasks={task.subtasks || []}
            onSubtasksUpdated={(updated) => setTask((prev) => ({ ...prev, subtasks: updated }))}
          />

          {/* Comment Thread Component */}
          <CommentThread
            taskId={taskId}
            projectId={projectId}
            comments={comments}
            onCommentAdded={(c) => setComments((prev) => [...prev, c])}
            onCommentDeleted={(id) => setComments((prev) => prev.filter((c) => c._id !== id))}
          />
        </div>

        {/* Column 2: Properties / Metadata Sidebar */}
        <div
          className="card"
          style={{
            flex: '0 0 240px',
            padding: '20px',
            background: 'var(--color-surface)',
          }}
        >
          <h3
            className="font-display"
            style={{
              margin: '0 0 16px 0',
              fontSize: '12px',
              fontWeight: 700,
              color: 'var(--color-text-secondary)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Properties
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* Status */}
            <div>
              <label className="field-label">Status</label>
              {editing ? (
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))}
                  className="input"
                >
                  {STATUSES.map((s) => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>
              ) : (
                <span className={`status-pill status-${task.status}`}>
                  {STATUSES.find((s) => s.id === task.status)?.label}
                </span>
              )}
            </div>

            {/* Priority */}
            <div>
              <label className="field-label">Priority</label>
              {editing ? (
                <select
                  value={editForm.priority}
                  onChange={(e) => setEditForm((f) => ({ ...f, priority: e.target.value }))}
                  className="input"
                >
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                  ))}
                </select>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className={`priority-dot priority-${task.priority}`} />
                  <span style={{ fontSize: '13px', color: 'var(--color-text-primary)', textTransform: 'capitalize', fontWeight: 600 }}>
                    {task.priority}
                  </span>
                </div>
              )}
            </div>

            {/* Assignee */}
            <div>
              <label className="field-label">Assignee</label>
              {editing ? (
                <select
                  value={editForm.assignee}
                  onChange={(e) => setEditForm((f) => ({ ...f, assignee: e.target.value }))}
                  className="input"
                >
                  <option value="">Unassigned</option>
                  {project?.members?.map((m) => (
                    <option key={m._id} value={m._id}>{m.name}</option>
                  ))}
                </select>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {task.assignee ? (
                    <>
                      <div
                        className="avatar"
                        style={{ width: '24px', height: '24px', fontSize: '9.5px', ...getAvatarStyle(task.assignee.name) }}
                      >
                        {task.assignee.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                      </div>
                      <span style={{ fontSize: '13px', color: 'var(--color-text-primary)', fontWeight: 600 }}>
                        {task.assignee.name}
                      </span>
                    </>
                  ) : (
                    <span style={{ fontSize: '12.5px', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                      Unassigned
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Due Date */}
            <div>
              <label className="field-label">Due Date</label>
              {editing ? (
                <input
                  type="date"
                  value={editForm.dueDate}
                  onChange={(e) => setEditForm((f) => ({ ...f, dueDate: e.target.value }))}
                  className="input"
                />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--color-text-primary)' }}>
                  <Calendar size={14} style={{ color: 'var(--color-text-muted)' }} />
                  <span>{task.dueDate ? format(new Date(task.dueDate), 'MMM d, yyyy') : 'No due date'}</span>
                </div>
              )}
            </div>

            {/* Timestamps */}
            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ fontSize: '11.5px', color: 'var(--color-text-muted)' }}>
                Created {format(new Date(task.createdAt), 'MMM d, yyyy')}
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--color-text-muted)' }}>
                Updated {format(new Date(task.updatedAt), 'MMM d, yyyy')}
              </div>
            </div>
          </div>
        </div>

        {/* Column 3: Activity Feed Column */}
        <div
          className="card"
          style={{
            flex: '0 0 240px',
            padding: '20px',
            background: 'var(--color-surface)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '16px' }}>
            <Activity size={14} style={{ color: 'var(--color-accent)' }} />
            <h3
              className="font-display"
              style={{
                margin: 0,
                fontSize: '12px',
                fontWeight: 700,
                color: 'var(--color-text-secondary)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Activity Feed
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', position: 'relative' }}>
            {activityItems.length === 0 ? (
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                No recent activity.
              </p>
            ) : (
              activityItems.map((item, idx) => (
                <div key={item.id || idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', position: 'relative' }}>
                  {/* Colored dot timeline node */}
                  <div
                    style={{
                      width: '7px',
                      height: '7px',
                      borderRadius: '50%',
                      background: item.color,
                      marginTop: '5px',
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: 'var(--color-text-primary)', lineHeight: 1.3 }}>
                      {item.text}
                    </p>
                    <span style={{ fontSize: '10.5px', color: 'var(--color-text-muted)', display: 'block', marginTop: '2px' }}>
                      {formatDistanceToNow(item.timestamp, { addSuffix: true })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
