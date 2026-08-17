import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

const GithubIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
  </svg>
);

const LinkedinIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
  </svg>
);

export default function Login() {
  const { login, setOAuthToken } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);

  useEffect(() => {
    const token = searchParams.get('token');
    const oauthError = searchParams.get('error');

    if (token) {
      setOAuthToken(token);
      navigate('/', { replace: true });
    } else if (oauthError) {
      setError(decodeURIComponent(oauthError));
    }
  }, [searchParams, setOAuthToken, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Invalid credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthLogin = async (provider) => {
    setError('');
    setOauthLoading(true);
    try {
      const res = await api.get(`/auth/${provider}`);
      if (res.data?.url) {
        window.location.href = res.data.url;
      } else {
        setError(`Did not receive authorization URL for ${provider}.`);
        setOauthLoading(false);
      }
    } catch (err) {
      console.error(`OAuth ${provider} error:`, err);
      const msg = err.response?.data?.message || err.message || `Failed to initiate ${provider} authentication.`;
      setError(msg);
      setOauthLoading(false);
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
      <div style={{ width: '100%', maxWidth: '380px' }} className="animate-fade-in">
        {/* Brand Mark */}
        <div style={{ marginBottom: '28px', textAlign: 'center' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              background: 'linear-gradient(135deg, #4F46E5 0%, #3730A3 100%)',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              fontSize: '16px',
              fontWeight: 800,
              color: '#FFF',
              boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)',
            }}
          >
            TF
          </div>
          <h1
            className="font-display"
            style={{
              margin: 0,
              fontSize: '22px',
              fontWeight: 800,
              color: 'var(--color-text-primary)',
              letterSpacing: '-0.025em',
            }}
          >
            Sign in to TaskFlow
          </h1>
        </div>

        {/* Card wrapper */}
        <div className="card" style={{ padding: '24px', background: 'var(--color-surface)', boxShadow: 'var(--shadow-md)' }}>
          {/* OAuth Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
            <button
              id="btn-oauth-github"
              type="button"
              disabled={oauthLoading}
              onClick={() => handleOAuthLogin('github')}
              className="btn btn-ghost"
              style={{
                width: '100%',
                justifyContent: 'center',
                padding: '9px',
                fontSize: '13px',
                background: '#0F172A',
                color: '#FFF',
                borderColor: '#1E293B',
              }}
            >
              <GithubIcon />
              Sign in with GitHub
            </button>

            <button
              id="btn-oauth-linkedin"
              type="button"
              disabled={oauthLoading}
              onClick={() => handleOAuthLogin('linkedin')}
              className="btn btn-ghost"
              style={{
                width: '100%',
                justifyContent: 'center',
                padding: '9px',
                fontSize: '13px',
                background: '#0A66C2',
                color: '#FFF',
                borderColor: '#0A66C2',
              }}
            >
              <LinkedinIcon />
              Sign in with LinkedIn
            </button>
          </div>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--color-border)' }} />
            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              or with email
            </span>
            <div style={{ flex: 1, height: '1px', background: 'var(--color-border)' }} />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label htmlFor="login-email" className="field-label">Email</label>
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="input"
                  placeholder="you@organization.com"
                />
              </div>
              <div>
                <label htmlFor="login-password" className="field-label">Password</label>
                <input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  className="input"
                  placeholder="••••••••"
                />
              </div>

              {error && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px',
                    padding: '10px 12px',
                    background: 'var(--color-danger-subtle)',
                    border: '1px solid rgba(225, 29, 72, 0.25)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '12px',
                    color: 'var(--color-danger)',
                  }}
                >
                  <AlertCircle size={15} style={{ flexShrink: 0, marginTop: '1px' }} />
                  <span>{error}</span>
                </div>
              )}

              <button
                id="btn-login-submit"
                type="submit"
                disabled={loading}
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center', padding: '9px', fontSize: '13px', marginTop: '4px' }}
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </div>
          </form>
        </div>

        <p style={{ marginTop: '20px', textAlign: 'center', fontSize: '12.5px', color: 'var(--color-text-secondary)' }}>
          Don't have an account?{' '}
          <Link to="/register" style={{ color: 'var(--color-accent)', textDecoration: 'none', fontWeight: 600 }}>
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
