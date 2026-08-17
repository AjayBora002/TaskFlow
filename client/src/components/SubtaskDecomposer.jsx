import { useState } from 'react';
import { Sparkles, CheckSquare, Square, Plus, Trash2, Loader2 } from 'lucide-react';
import api from '../api/axios';

export default function SubtaskDecomposer({ taskId, projectId, subtasks = [], onSubtasksUpdated }) {
  const [loading, setLoading] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  const handleDecompose = async () => {
    setLoading(true);
    try {
      const res = await api.post('/ai/decompose', { taskId });
      if (onSubtasksUpdated) onSubtasksUpdated(res.data.task.subtasks);
    } catch (err) {
      console.error('Decompose error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (index) => {
    const updated = subtasks.map((s, i) => (i === index ? { ...s, completed: !s.completed } : s));
    try {
      const res = await api.put(`/projects/${projectId}/tasks/${taskId}`, { subtasks: updated });
      if (onSubtasksUpdated) onSubtasksUpdated(res.data.subtasks);
    } catch (err) {
      console.error('Toggle subtask error:', err);
    }
  };

  const handleAddManual = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const updated = [...subtasks, { title: newTitle.trim(), completed: false }];
    try {
      const res = await api.put(`/projects/${projectId}/tasks/${taskId}`, { subtasks: updated });
      if (onSubtasksUpdated) onSubtasksUpdated(res.data.subtasks);
      setNewTitle('');
    } catch (err) {
      console.error('Add subtask error:', err);
    }
  };

  const handleDelete = async (index) => {
    const updated = subtasks.filter((_, i) => i !== index);
    try {
      const res = await api.put(`/projects/${projectId}/tasks/${taskId}`, { subtasks: updated });
      if (onSubtasksUpdated) onSubtasksUpdated(res.data.subtasks);
    } catch (err) {
      console.error('Delete subtask error:', err);
    }
  };

  const completedCount = subtasks.filter((s) => s.completed).length;
  const progressPercent = subtasks.length > 0 ? Math.round((completedCount / subtasks.length) * 100) : 0;

  return (
    <div style={{ marginTop: '24px', marginBottom: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="field-label" style={{ margin: 0 }}>Subtasks & Checklist ({completedCount}/{subtasks.length})</span>
        </div>

        <button
          onClick={handleDecompose}
          disabled={loading}
          className="btn btn-ghost"
          style={{ fontSize: '11.5px', padding: '4px 10px', gap: '5px' }}
        >
          {loading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} style={{ color: 'var(--color-accent)' }} />}
          Auto-Decompose with AI
        </button>
      </div>

      {subtasks.length > 0 && (
        <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className="progress-track" style={{ flex: 1 }}>
            <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
          </div>
          <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}>
            {progressPercent}%
          </span>
        </div>
      )}

      {/* Subtask list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
        {subtasks.map((st, idx) => (
          <div
            key={idx}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 12px',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              transition: 'all 0.12s ease',
            }}
          >
            <div
              onClick={() => handleToggle(idx)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                cursor: 'pointer',
                flex: 1,
                userSelect: 'none',
              }}
            >
              {st.completed ? (
                <CheckSquare size={16} style={{ color: 'var(--color-accent)' }} />
              ) : (
                <Square size={16} style={{ color: 'var(--color-text-muted)' }} />
              )}
              <span
                style={{
                  fontSize: '13px',
                  color: st.completed ? 'var(--color-text-muted)' : 'var(--color-text-primary)',
                  textDecoration: st.completed ? 'line-through' : 'none',
                }}
              >
                {st.title}
              </span>
            </div>

            <button
              onClick={() => handleDelete(idx)}
              className="btn-icon"
              style={{ padding: '2px' }}
              title="Delete subtask"
            >
              <Trash2 size={12} style={{ color: 'var(--color-text-muted)' }} />
            </button>
          </div>
        ))}
      </div>

      {/* Add manual subtask */}
      <form onSubmit={handleAddManual} style={{ display: 'flex', gap: '8px' }}>
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Add a checklist item..."
          className="input"
          style={{ flex: 1, padding: '6px 10px', fontSize: '12px' }}
        />
        <button
          type="submit"
          disabled={!newTitle.trim()}
          className="btn btn-ghost"
          style={{ padding: '6px 12px', fontSize: '12px' }}
        >
          <Plus size={14} /> Add
        </button>
      </form>
    </div>
  );
}
