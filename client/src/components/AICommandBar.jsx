import { useState, useEffect } from 'react';
import { Sparkles, Command, ArrowRight, Loader2, X } from 'lucide-react';
import api from '../api/axios';

export default function AICommandBar({ projectId, onTaskCreated }) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!prompt.trim() || !projectId) return;

    setLoading(true);
    setError('');
    try {
      const res = await api.post('/ai/parse-command', { projectId, prompt: prompt.trim() });
      if (onTaskCreated) onTaskCreated(res.data.task);
      setPrompt('');
      setOpen(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to process command with AI');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Shortcut indicator trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="btn btn-ghost"
        style={{
          fontSize: '12px',
          gap: '6px',
          padding: '6px 12px',
          background: 'var(--color-surface-2)',
          borderColor: 'var(--color-border)',
        }}
      >
        <Sparkles size={14} style={{ color: 'var(--color-accent)' }} />
        <span>AI Copilot</span>
        <kbd
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            background: 'var(--color-surface-3)',
            padding: '1px 5px',
            borderRadius: 'var(--radius-xs)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-muted)',
            marginLeft: '4px',
          }}
        >
          ⌘K
        </kbd>
      </button>

      {/* Command Palette Modal */}
      {open && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div
            className="modal-box animate-scale-in"
            style={{ maxWidth: '580px', padding: 0, overflow: 'hidden', background: 'var(--color-surface)' }}
          >
            {/* Input bar */}
            <form onSubmit={handleSubmit}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '16px 20px',
                  borderBottom: '1px solid var(--color-border)',
                  background: 'var(--color-surface-2)',
                }}
              >
                <Sparkles size={18} style={{ color: 'var(--color-accent)', flexShrink: 0 }} />
                <input
                  type="text"
                  autoFocus
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder='e.g. "Assign Alex to fix auth memory leak by Friday high priority"'
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: 'var(--color-text-primary)',
                    fontSize: '14px',
                    fontFamily: 'var(--font-sans)',
                  }}
                />
                {loading ? (
                  <Loader2 size={18} className="animate-spin" style={{ color: 'var(--color-accent)' }} />
                ) : (
                  <button
                    type="submit"
                    disabled={!prompt.trim()}
                    className="btn btn-primary"
                    style={{ padding: '6px 12px', fontSize: '12px' }}
                  >
                    Generate <ArrowRight size={13} />
                  </button>
                )}
                <button type="button" onClick={() => setOpen(false)} className="btn-icon">
                  <X size={16} />
                </button>
              </div>
            </form>

            {/* Helper hints */}
            <div style={{ padding: '14px 20px', background: 'var(--color-surface)' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                Natural Language AI Examples
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {[
                  'Create urgent bugfix for memory leak assigned to Jamie by tomorrow',
                  'Add task "Write E2E integration tests" in progress low priority',
                  'Assign Alex to review API rate limiting documentation',
                ].map((ex, i) => (
                  <div
                    key={i}
                    onClick={() => setPrompt(ex)}
                    style={{
                      fontSize: '12px',
                      color: 'var(--color-text-secondary)',
                      padding: '6px 10px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--color-surface-2)',
                      cursor: 'pointer',
                      transition: 'background 0.12s ease, color 0.12s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--color-surface-3)';
                      e.currentTarget.style.color = 'var(--color-text-primary)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--color-surface-2)';
                      e.currentTarget.style.color = 'var(--color-text-secondary)';
                    }}
                  >
                    "{ex}"
                  </div>
                ))}
              </div>

              {error && (
                <p style={{ margin: '12px 0 0', fontSize: '12px', color: 'var(--color-danger)' }}>{error}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
