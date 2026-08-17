import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Trash2, Send, MessageSquare, Code, Copy, Check } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

function FormattedCommentText({ text }) {
  const [copiedIndex, setCopiedIndex] = useState(null);

  // Parse markdown code blocks (```lang ... ```) and inline code (`...`)
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: text.slice(lastIndex, match.index) });
    }
    parts.push({
      type: 'codeblock',
      language: match[1] || 'code',
      content: match[2].trim(),
    });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push({ type: 'text', content: text.slice(lastIndex) });
  }

  const handleCopy = (code, idx) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {parts.map((part, idx) => {
        if (part.type === 'codeblock') {
          const isCopied = copiedIndex === idx;
          return (
            <div
              key={idx}
              style={{
                borderRadius: '8px',
                background: '#1A1D24',
                border: '1px solid #2A2F3D',
                overflow: 'hidden',
                margin: '4px 0',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {/* Code block header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 12px',
                  background: '#12141A',
                  borderBottom: '1px solid #2A2F3D',
                  fontSize: '11px',
                  color: '#8A92A6',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 600, textTransform: 'lowercase' }}>
                  <Code size={12} />
                  {part.language}
                </span>
                <button
                  onClick={() => handleCopy(part.content, idx)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: 'transparent',
                    border: 'none',
                    color: isCopied ? '#5F8F67' : '#8A92A6',
                    cursor: 'pointer',
                    fontSize: '11px',
                    fontFamily: 'var(--font-sans)',
                  }}
                >
                  {isCopied ? <Check size={12} /> : <Copy size={12} />}
                  {isCopied ? 'Copied' : 'Copy'}
                </button>
              </div>

              {/* Code content */}
              <pre
                style={{
                  margin: 0,
                  padding: '12px',
                  fontSize: '12px',
                  lineHeight: 1.5,
                  color: '#E2E8F0',
                  overflowX: 'auto',
                  whiteSpace: 'pre',
                }}
              >
                <code>{part.content}</code>
              </pre>
            </div>
          );
        }

        return (
          <p
            key={idx}
            style={{
              margin: 0,
              fontSize: '13px',
              color: 'var(--color-text-primary)',
              lineHeight: 1.55,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {part.content}
          </p>
        );
      })}
    </div>
  );
}

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
          Discussion & Code Snippets
        </h3>
        <span className="badge badge-muted">
          {comments.length}
        </span>
      </div>

      {/* Comment List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
        {comments.length === 0 ? (
          <div
            style={{
              padding: '24px',
              textAlign: 'center',
              background: 'var(--color-surface)',
              border: '1px dashed var(--color-border)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-text-muted)',
              fontSize: '12.5px',
            }}
          >
            No comments or code snippets shared yet. Start the conversation below!
          </div>
        ) : (
          comments.map((c) => (
            <div
              key={c._id}
              style={{
                display: 'flex',
                gap: '12px',
                padding: '14px',
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div
                className="avatar avatar-accent"
                style={{ width: '28px', height: '28px', fontSize: '10px', marginTop: '2px' }}
              >
                {getInitials(c.author?.name)}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                      {c.author?.name || 'Teammate'}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {c.createdAt ? formatDistanceToNow(new Date(c.createdAt), { addSuffix: true }) : 'just now'}
                    </span>
                  </div>

                  {(c.author?._id === user?.id || user?.id === c.author) && (
                    <button
                      onClick={() => handleDelete(c._id)}
                      className="btn-icon"
                      title="Delete comment"
                      style={{ color: 'var(--color-danger)', opacity: 0.7 }}
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>

                <FormattedCommentText text={c.body} />
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
            borderRadius: 'var(--radius-md)',
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
            placeholder="Write a comment or paste code snippet (use ```js for syntax formatting)..."
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
              padding: '8px 12px',
              borderTop: '1px solid var(--color-border-subtle)',
              background: 'var(--color-surface-2)',
            }}
          >
            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
              Tip: Use ```js ... ``` for code formatting. Press Cmd+Enter to send.
            </span>

            <button
              id="btn-post-comment"
              type="submit"
              disabled={submitting || !body.trim()}
              className="btn btn-primary"
              style={{ padding: '5px 12px', fontSize: '12px' }}
            >
              <Send size={13} />
              {submitting ? 'Posting...' : 'Post Update'}
            </button>
          </div>
        </div>
      </form>

      {error && (
        <p style={{ margin: '8px 0 0', fontSize: '12px', color: 'var(--color-danger)' }}>{error}</p>
      )}
    </div>
  );
}
