import { useState } from 'react';
import { ShieldAlert, AlertTriangle, CheckCircle, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import api from '../api/axios';

export default function AIAuditPanel({ projectId }) {
  const [audit, setAudit] = useState(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const runAudit = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/ai/audit/${projectId}`);
      setAudit(res.data);
      setOpen(true);
    } catch (err) {
      console.error('Audit fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (score) => {
    if (score > 60) return 'var(--color-danger)';
    if (score > 30) return 'var(--color-priority-medium)';
    return 'var(--color-accent)';
  };

  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button
          onClick={runAudit}
          disabled={loading}
          className="btn btn-ghost"
          style={{ fontSize: '12px', gap: '6px' }}
        >
          <ShieldAlert size={14} style={{ color: audit ? getRiskColor(audit.riskScore) : 'var(--color-text-secondary)' }} />
          {loading ? 'Analyzing Telemetry...' : audit ? `AI Risk Index: ${audit.riskScore}%` : 'Run AI Risk Audit'}
          {loading && <RefreshCw size={12} className="animate-spin" />}
        </button>

        {audit && (
          <button
            onClick={() => setOpen((o) => !o)}
            className="btn-icon"
            title="Toggle Audit Details"
          >
            {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        )}
      </div>

      {audit && open && (
        <div
          className="animate-slide-down card"
          style={{
            marginTop: '10px',
            padding: '16px 20px',
            background: 'var(--color-surface)',
            border: `1px solid ${getRiskColor(audit.riskScore)}`,
            boxShadow: 'var(--shadow-md)',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldAlert size={16} style={{ color: getRiskColor(audit.riskScore) }} />
              <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                Project Health Telemetry
              </span>
            </div>
            <span
              className="badge"
              style={{
                background: `rgba(${audit.riskScore > 60 ? '224,52,52' : '47,158,111'}, 0.12)`,
                color: getRiskColor(audit.riskScore),
                fontSize: '11px',
              }}
            >
              Risk Index: {audit.riskScore}%
            </span>
          </div>

          <p style={{ margin: '0 0 14px', fontSize: '13px', color: 'var(--color-text-primary)', lineHeight: 1.5 }}>
            {audit.summary}
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {/* Bottlenecks */}
            <div>
              <span className="field-label" style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--color-priority-medium)' }}>
                <AlertTriangle size={12} /> Detected Bottlenecks
              </span>
              <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '12px', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                {audit.bottlenecks?.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            </div>

            {/* Recommendations */}
            <div>
              <span className="field-label" style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--color-accent)' }}>
                <CheckCircle size={12} /> AI Recommendations
              </span>
              <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '12px', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                {audit.recommendations?.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
