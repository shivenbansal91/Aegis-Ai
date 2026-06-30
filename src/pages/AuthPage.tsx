import React from 'react';
import { motion } from 'framer-motion';
import { signInWithGoogle } from '../lib/auth';

export default function AuthPage() {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSignIn() {
    setLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError('Sign in failed. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div className="auth-root">
      {/* Background */}
      <div className="auth-orb orb-1" />
      <div className="auth-orb orb-2" />
      <div className="grid-overlay" />

      <motion.div
        className="auth-card glass-strong"
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Logo */}
        <div className="auth-logo">
          <div className="auth-logo-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="url(#ag)" strokeWidth="1.5" strokeLinejoin="round"/>
              <path d="M2 17l10 5 10-5" stroke="url(#ag)" strokeWidth="1.5" strokeLinejoin="round"/>
              <path d="M2 12l10 5 10-5" stroke="url(#ag)" strokeWidth="1.5" strokeLinejoin="round"/>
              <defs>
                <linearGradient id="ag" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#4f8ef7"/>
                  <stop offset="1" stopColor="#7c3aed"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
          <span className="auth-logo-name">Aegis AI</span>
        </div>

        <h1 className="auth-title">Welcome back</h1>
        <p className="auth-subtitle">Sign in to your personal AI Chief of Staff</p>

        {error && (
          <div className="auth-error">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
            {error}
          </div>
        )}

        <button
          id="google-signin-btn"
          className="google-btn"
          onClick={handleSignIn}
          disabled={loading}
        >
          {loading ? (
            <div className="spinner" />
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          )}
          {loading ? 'Redirecting to Google…' : 'Continue with Google'}
        </button>

        <div className="auth-divider">
          <div className="divider-line" />
          <span className="divider-text">Secure, fast, one-click</span>
          <div className="divider-line" />
        </div>

        <div className="auth-features">
          {AUTH_FEATURES.map(f => (
            <div key={f} className="auth-feature-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent-blue)" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              {f}
            </div>
          ))}
        </div>

        <p className="auth-terms">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </motion.div>

      <style>{AUTH_STYLES}</style>
    </div>
  );
}

const AUTH_FEATURES = [
  'AI-powered goal decomposition',
  'Real-time deadline risk prediction',
  'Autonomous replanning',
];

const AUTH_STYLES = `
.auth-root {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  position: relative;
  overflow: hidden;
}
.auth-orb {
  position: fixed;
  border-radius: 50%;
  filter: blur(80px);
  pointer-events: none;
}
.auth-orb.orb-1 {
  width: 500px; height: 500px;
  background: radial-gradient(circle, rgba(79,142,247,0.12) 0%, transparent 70%);
  top: -150px; left: -100px;
}
.auth-orb.orb-2 {
  width: 400px; height: 400px;
  background: radial-gradient(circle, rgba(124,58,237,0.10) 0%, transparent 70%);
  bottom: -100px; right: -100px;
}
.auth-card {
  width: 100%;
  max-width: 420px;
  border-radius: var(--radius-xl);
  padding: 48px 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  position: relative;
  z-index: 1;
  box-shadow: var(--shadow-lg);
}
.auth-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 32px;
}
.auth-logo-icon {
  width: 48px; height: 48px;
  border-radius: 12px;
  background: rgba(79,142,247,0.1);
  border: 1px solid rgba(79,142,247,0.2);
  display: flex;
  align-items: center;
  justify-content: center;
}
.auth-logo-name {
  font-size: 20px;
  font-weight: 800;
  letter-spacing: -0.5px;
}
.auth-title {
  font-size: 26px;
  font-weight: 800;
  letter-spacing: -1px;
  margin-bottom: 8px;
}
.auth-subtitle {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 32px;
  line-height: 1.5;
}
.auth-error {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  background: rgba(239,68,68,0.08);
  border: 1px solid rgba(239,68,68,0.2);
  color: #ef4444;
  font-size: 13px;
  padding: 10px 14px;
  border-radius: var(--radius-md);
  margin-bottom: 16px;
}
.google-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  width: 100%;
  padding: 14px;
  background: rgba(255,255,255,0.06);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  color: var(--text-primary);
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s, transform 0.15s;
  font-family: 'Inter', sans-serif;
}
.google-btn:hover:not(:disabled) {
  background: rgba(255,255,255,0.10);
  border-color: var(--border-strong);
  transform: translateY(-1px);
}
.google-btn:disabled { opacity: 0.6; cursor: not-allowed; }

.spinner {
  width: 20px; height: 20px;
  border: 2px solid rgba(255,255,255,0.2);
  border-top-color: var(--accent-blue);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.auth-divider {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  margin: 24px 0;
}
.divider-line { flex: 1; height: 1px; background: var(--border-subtle); }
.divider-text { font-size: 12px; color: var(--text-muted); white-space: nowrap; }

.auth-features {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
  text-align: left;
}
.auth-feature-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: var(--text-secondary);
}
.auth-terms {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 24px;
  line-height: 1.5;
}
`;
