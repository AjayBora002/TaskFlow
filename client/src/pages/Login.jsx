import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--color-base)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div style={{ width: '100%', maxWidth: '360px' }}>
        {/* Mark */}
        <div style={{ marginBottom: '32px', textAlign: 'center' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              background: 'var(--color-accent)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px',
              fontSize: '14px',
              fontWeight: 700,
              color: '#fff',
              fontFamily: 'var(--font-mono)',
            }}
          >
            TF
          </div>
          <h1
            style={{
              margin: 0,
              fontSize: '18px',
              fontWeight: 600,
              color: 'var(--color-text-primary)',
              letterSpacing: '-0.02em',
            }}
          >
            Sign in to TaskFlow
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: '12.5px', color: 'var(--color-text-muted)' }}>
            Use demo: alex@taskflow.dev / password123
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label htmlFor="login-email" style={labelStyle}>Email</label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                required
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                style={inputStyle}
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label htmlFor="login-password" style={labelStyle}>Password</label>
              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                required
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                style={inputStyle}
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p
                style={{
                  margin: 0,
                  padding: '8px 12px',
                  background: 'rgba(197, 48, 48, 0.08)',
                  border: '1px solid rgba(197, 48, 48, 0.25)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '12px',
                  color: 'var(--color-priority-high)',
                }}
              >
                {error}
              </p>
            )}

            <button
              id="btn-login-submit"
              type="submit"
              disabled={loading}
              style={primaryBtnStyle}
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </div>
        </form>

        <p style={{ marginTop: '20px', textAlign: 'center', fontSize: '12px', color: 'var(--color-text-muted)' }}>
          No account?{' '}
          <Link to="/register" style={{ color: 'var(--color-accent)', textDecoration: 'none' }}>
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}

const labelStyle = {
  display: 'block',
  fontSize: '11.5px',
  fontWeight: 500,
  color: 'var(--color-text-secondary)',
  marginBottom: '5px',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
};

const inputStyle = {
  width: '100%',
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  padding: '8px 11px',
  color: 'var(--color-text-primary)',
  fontSize: '13px',
  fontFamily: 'var(--font-sans)',
  outline: 'none',
  transition: 'border-color 0.12s ease',
  boxSizing: 'border-box',
};

const primaryBtnStyle = {
  width: '100%',
  background: 'var(--color-accent)',
  border: 'none',
  borderRadius: 'var(--radius-md)',
  padding: '9px',
  color: '#fff',
  fontSize: '13px',
  fontWeight: 600,
  cursor: 'pointer',
  marginTop: '4px',
  transition: 'background 0.12s ease',
  fontFamily: 'var(--font-sans)',
};
