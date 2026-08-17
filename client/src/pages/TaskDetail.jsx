import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ArrowLeft, Trash2, ChevronRight, Save, X, Clock, Calendar, User, Tag, Sparkles, Loader2 } from 'lucide-react';
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
      <div style={{ padding: '32px', maxWidth: '800px', margin: '0 auto' }}>
        <div className="skeleton" style={{ height: '24px', width: '180px', marginBottom: '20px' }} />
        <div className="skeleton" style={{ height: '36px', width: '100%', marginBottom: '24px' }} />
        <div className="skeleton" style={{ height: '120px', width: '100%' }} />
      </div>
    );
  }

  if (!task) return null;

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'auto', background: 'var(--color-base)' }}>
      {/* Main Task Area */}
      <div style={{ flex: 1, padding: '24px 32px', maxWidth: '780px', minWidth: 0 }}>
        {/* Navigation Breadcrumb */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            marginBottom: '20px',
            fontSize: '12px',
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
              fontWeight: 500,
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
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '20px' }}>
          <div className={`status-stripe status-stripe-${task.status}`} style={{ height: '32px', borderRadius: 'var(--radius-xs)' }} />
          <div style={{ flex: 1 }}>
            {editing ? (
              <input
                id="task-title-edit"
                value={editForm.title}
                onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                className="input"
                style={{ fontSize: '18px', fontWeight: 600, padding: '6px 10px' }}
              />
            ) : (
              <h1
                style={{
                  margin: 0,
                  fontSize: '20px',
                  fontWeight: 700,
                  color: 'var(--color-text-primary)',
                  lineHeight: 1.3,
                  letterSpacing: '-0.02em',
                }}
              >
                {task.title}
              </h1>
            )}
          </div>
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
                  <span style={{ fontSize: '12px', color: 'var(--color-danger)', fontWeight: 500 }}>Confirm deletion?</span>
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
        <div className="card" style={{ padding: '20px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', marginBottom: '24px' }}>
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

      {/* Right Sidebar Metadata Panel */}
      <div
        style={{
          width: '260px',
          flexShrink: 0,
          borderLeft: '1px solid var(--color-border)',
          background: 'var(--color-surface)',
          padding: '24px 20px',
          overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Status */}
          <div>
            <label className="field-label">Status</label>
            {editing ? (
              <select
                id="task-status-edit"
                value={editForm.status}
                onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))}
                className="input"
              >
                {STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            ) : (
              <span className={`status-pill status-${task.status}`}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor' }} />
                {STATUSES.find((s) => s.id === task.status)?.label}
              </span>
            )}
          </div>

          {/* Priority */}
          <div>
            <label className="field-label">Priority</label>
            {editing ? (
              <select
                id="task-priority-edit"
                value={editForm.priority}
                onChange={(e) => setEditForm((f) => ({ ...f, priority: e.target.value }))}
                className="input"
              >
                {PRIORITIES.map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
              </select>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className={`priority-dot priority-${task.priority}`} />
                <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-primary)' }}>
                  {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                </span>
              </div>
            )}
          </div>

          {/* Assignee */}
          <div>
            <label className="field-label">Assignee</label>
            {editing ? (
              <select
                id="task-assignee-edit"
                value={editForm.assignee}
                onChange={(e) => setEditForm((f) => ({ ...f, assignee: e.target.value }))}
                className="input"
              >
                <option value="">Unassigned</option>
                {project?.members?.map((m) => (
                  <option key={m._id} value={m._id}>{m.name}</option>
                ))}
              </select>
            ) : task.assignee ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div className="avatar avatar-accent" style={{ width: '24px', height: '24px', fontSize: '9px' }}>
                  {task.assignee.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                </div>
                <span style={{ fontSize: '13px', color: 'var(--color-text-primary)', fontWeight: 500 }}>{task.assignee.name}</span>
              </div>
            ) : (
              <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>Unassigned</span>
            )}
          </div>

          {/* Reporter */}
          <div>
            <label className="field-label">Reporter</label>
            <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
              {task.reporter?.name || '—'}
            </span>
          </div>

          {/* Due Date */}
          <div>
            <label className="field-label">Due Date</label>
            {editing ? (
              <input
                id="task-due-edit"
                type="date"
                value={editForm.dueDate}
                onChange={(e) => setEditForm((f) => ({ ...f, dueDate: e.target.value }))}
                className="input"
              />
            ) : task.dueDate ? (
              <span
                style={{
                  fontSize: '12px',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--color-text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Calendar size={13} style={{ color: 'var(--color-text-muted)' }} />
                {format(new Date(task.dueDate), 'MMM d, yyyy')}
              </span>
            ) : (
              <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>None set</span>
            )}
          </div>

          <div style={{ height: '1px', background: 'var(--color-border)', margin: '4px 0' }} />

          {/* Created date */}
          <div>
            <label className="field-label">Created</label>
            <span style={{ fontSize: '11.5px', fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}>
              {format(new Date(task.createdAt), 'MMM d, yyyy')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
