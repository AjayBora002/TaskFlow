import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Trash2, Send, MessageSquare } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function CommentThread({ taskId, projectId, comments, onCommentAdded, onCommentDeleted }) {
  const { user } = useAuth();
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!body.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await api.post(`/projects/${projectId}/tasks/${taskId}/comments`, { body });
      onCommentAdded(res.data);
      setBody('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId) => {
    try {
      await api.delete(`/projects/${projectId}/tasks/${taskId}/comments/${commentId}`);
      onCommentDeleted(commentId);
    } catch (err) {
      console.error('Delete comment error:', err);
    }
  };

  const getInitials = (name) =>
    name ? name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) : '?';

  return (
    <div style={{ marginTop: '28px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px' }}>
        <MessageSquare size={16} style={{ color: 'var(--color-text-muted)' }} />
        <h3
          style={{
            margin: 0,
            fontSize: '13px',
            fontWeight: 600,
            color: 'var(--color-text-secondary)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          Discussion
        </h3>
        <span className="badge badge-muted">
          {comments.length}
        </span>
      </div>

      {/* Comment List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
        {comments.length === 0 ? (
          <div
            style={{
              padding: '24px',
              textAlign: 'center',
              background: 'var(--color-surface)',
              border: '1px dashed var(--color-border)',
              borderRadius: 'var(--radius-lg)',
            }}
          >
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: 0 }}>
              No comments yet. Start the conversation below.
            </p>
          </div>
        ) : (
          comments.map((c) => (
            <div
              key={c._id}
              className="animate-fade-in card"
              style={{
                display: 'flex',
                gap: '12px',
                alignItems: 'flex-start',
                padding: '14px 16px',
                background: 'var(--color-surface)',
              }}
            >
              {/* Author Avatar */}
              <div
                className="avatar"
                style={{ width: '28px', height: '28px', fontSize: '9.5px', marginTop: '2px' }}
              >
                {getInitials(c.author?.name)}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                      {c.author?.name}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
                    </span>
                  </div>

                  {String(c.author?._id) === String(user?._id) && (
                    <button
                      onClick={() => handleDelete(c._id)}
                      title="Delete comment"
                      className="btn-icon"
                      style={{ padding: '3px' }}
                    >
                      <Trash2 size={13} style={{ color: 'var(--color-danger)' }} />
                    </button>
                  )}
                </div>
                <p
                  style={{
                    margin: 0,
                    fontSize: '13px',
                    color: 'var(--color-text-primary)',
                    lineHeight: 1.55,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {c.body}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Compose Form */}
      <form onSubmit={handleSubmit}>
        <div
          style={{
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            background: 'var(--color-surface)',
            overflow: 'hidden',
            boxShadow: 'var(--shadow-sm)',
            transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
          }}
        >
          <textarea
            id="comment-input"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write a comment or update..."
            rows={3}
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              padding: '12px 14px',
              color: 'var(--color-text-primary)',
              fontSize: '13px',
              fontFamily: 'var(--font-sans)',
              resize: 'vertical',
              outline: 'none',
              lineHeight: 1.5,
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                handleSubmit(e);
              }
            }}
          />
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 14px',
              background: 'var(--color-surface-2)',
              borderTop: '1px solid var(--color-border)',
            }}
          >
            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
              Press Ctrl + Enter to post
            </span>
            <button
              id="btn-submit-comment"
              type="submit"
              disabled={submitting || !body.trim()}
              className="btn btn-primary"
              style={{
                opacity: body.trim() ? 1 : 0.5,
                cursor: body.trim() ? 'pointer' : 'not-allowed',
                padding: '5px 12px',
                fontSize: '12px',
              }}
            >
              <Send size={13} />
              {submitting ? 'Posting...' : 'Comment'}
            </button>
          </div>
        </div>
        {error && (
          <p style={{ margin: '8px 0 0', fontSize: '12px', color: 'var(--color-danger)' }}>{error}</p>
        )}
      </form>
    </div>
  );
}
