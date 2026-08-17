import { useState } from 'react';
import { Sparkles, FileText, CheckCircle2, Clock, AlertTriangle, X, Loader2 } from 'lucide-react';
import api from '../api/axios';

export default function AIDigestModal({ projectId, projectName }) {
  const [open, setOpen] = useState(false);
  const [digest, setDigest] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchDigest = async () => {
    setOpen(true);
    if (digest) return;
    setLoading(true);
    try {
      const res = await api.get(`/ai/digest/${projectId}`);
      setDigest(res.data);
    } catch (err) {
      console.error('Digest error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={fetchDigest}
        className="btn btn-ghost"
        style={{ fontSize: '12px', gap: '6px' }}
      >
        <FileText size={14} style={{ color: 'var(--color-accent)' }} />
        AI Standup Digest
      </button>

      {open && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div className="modal-box animate-scale-in" style={{ maxWidth: '520px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={18} style={{ color: 'var(--color-accent)' }} />
                <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                  AI Standup Digest
                </h2>
              </div>
              <button onClick={() => setOpen(false)} className="btn-icon"><X size={18} /></button>
            </div>

            {loading ? (
              <div style={{ padding: '36px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 12px', display: 'block', color: 'var(--color-accent)' }} />
                Analyzing recent project telemetry...
              </div>
            ) : digest ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Completed */}
                <div className="card" style={{ padding: '14px 16px', background: 'var(--color-surface)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-status-done)', marginBottom: '8px', fontSize: '12px', fontWeight: 600 }}>
                    <CheckCircle2 size={14} /> Completed Tasks
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12.5px', color: 'var(--color-text-primary)', lineHeight: 1.5 }}>
                    {digest.completed?.map((c, i) => <li key={i}>{c}</li>)}
                  </ul>
                </div>

                {/* In Progress */}
                <div className="card" style={{ padding: '14px 16px', background: 'var(--color-surface)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-status-inprogress)', marginBottom: '8px', fontSize: '12px', fontWeight: 600 }}>
                    <Clock size={14} /> In Progress & Review
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12.5px', color: 'var(--color-text-primary)', lineHeight: 1.5 }}>
                    {digest.inProgress?.map((ip, i) => <li key={i}>{ip}</li>)}
                  </ul>
                </div>

                {/* Blockers */}
                <div className="card" style={{ padding: '14px 16px', background: 'var(--color-surface)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-danger)', marginBottom: '8px', fontSize: '12px', fontWeight: 600 }}>
                    <AlertTriangle size={14} /> Active Blockers
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12.5px', color: 'var(--color-text-primary)', lineHeight: 1.5 }}>
                    {digest.blockers?.map((b, i) => <li key={i}>{b}</li>)}
                  </ul>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </>
  );
}
