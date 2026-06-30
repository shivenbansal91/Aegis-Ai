import React from 'react';
import { motion } from 'framer-motion';
import { signInWithGoogle } from '../lib/auth';

export default function LandingPage() {
  const [loading, setLoading] = React.useState(false);

  async function handleGoogleSignIn() {
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      console.error('Sign in failed:', err);
      setLoading(false);
    }
  }

  return (
    <div className="landing-root">
      {/* Ambient background orbs */}
      <div className="ambient-orb orb-1" />
      <div className="ambient-orb orb-2" />
      <div className="ambient-orb orb-3" />

      {/* Grid overlay */}
      <div className="grid-overlay" />

      {/* ── NAVBAR ── */}
      <nav className="landing-nav">
        <div className="landing-nav-inner">
          <div className="brand">
            <div className="brand-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="url(#g1)" strokeWidth="1.5" strokeLinejoin="round"/>
                <path d="M2 17l10 5 10-5" stroke="url(#g1)" strokeWidth="1.5" strokeLinejoin="round"/>
                <path d="M2 12l10 5 10-5" stroke="url(#g1)" strokeWidth="1.5" strokeLinejoin="round"/>
                <defs>
                  <linearGradient id="g1" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#4f8ef7"/>
                    <stop offset="1" stopColor="#7c3aed"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <span className="brand-name">Aegis AI</span>
          </div>

          <div className="nav-links">
            <a href="#features" className="nav-link">Features</a>
            <a href="#how-it-works" className="nav-link">How it works</a>
          </div>

          <button
            className="btn-primary btn-sm"
            onClick={handleGoogleSignIn}
            disabled={loading}
          >
            {loading ? 'Redirecting…' : 'Get Started'}
          </button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="hero-section">
        <motion.div
          className="hero-content"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <motion.div
            className="hero-badge"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.5 }}
          >
            <span className="badge-dot" />
            Powered by Gemini 2.5 Flash
          </motion.div>

          <motion.h1
            className="hero-title"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
          >
            Your AI Chief
            <br />
            <span className="gradient-text">of Staff.</span>
          </motion.h1>

          <motion.p
            className="hero-subtitle"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.8 }}
          >
            Aegis AI doesn't just track your goals — it actively works to complete them.
            <br />
            Plans, predicts risks, replans, and keeps you on track. Every single day.
          </motion.p>

          <motion.div
            className="hero-cta"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
          >
            <button
              className="btn-primary btn-lg"
              onClick={handleGoogleSignIn}
              disabled={loading}
              id="hero-google-signin"
            >
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>

            <button className="btn-ghost btn-lg" onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}>
              See how it works
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </button>
          </motion.div>

          {/* Social proof */}
          <motion.div
            className="hero-proof"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.8 }}
          >
            <div className="proof-avatars">
              {['S', 'A', 'R', 'K'].map((l, i) => (
                <div key={i} className="proof-avatar" style={{ zIndex: 4 - i }}>{l}</div>
              ))}
            </div>
            <span className="proof-text">
              Trusted by students, founders & professionals
            </span>
          </motion.div>
        </motion.div>

        {/* Hero visual — dashboard preview card */}
        <motion.div
          className="hero-visual"
          initial={{ opacity: 0, x: 40, rotateY: -10 }}
          animate={{ opacity: 1, x: 0, rotateY: 0 }}
          transition={{ delay: 0.4, duration: 1, ease: [0.16, 1, 0.3, 1] }}
        >
          <DashboardPreviewCard />
        </motion.div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="features-section">
        <motion.div
          className="section-header"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="section-badge">Core Capabilities</div>
          <h2 className="section-title">Built to finish what you start</h2>
          <p className="section-subtitle">Every feature is designed around one question: what's the best action to take right now?</p>
        </motion.div>

        <div className="features-grid">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              className="feature-card glass"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.6 }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
            >
              <div className="feature-icon">{f.icon}</div>
              <h3 className="feature-title">{f.title}</h3>
              <p className="feature-desc">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="how-section">
        <motion.div
          className="section-header"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="section-badge">Workflow</div>
          <h2 className="section-title">From goal to done — automatically</h2>
        </motion.div>

        <div className="steps-list">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.title}
              className="step-item"
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.6 }}
            >
              <div className="step-number">{String(i + 1).padStart(2, '0')}</div>
              <div className="step-content">
                <h3 className="step-title">{step.title}</h3>
                <p className="step-desc">{step.desc}</p>
              </div>
              {i < STEPS.length - 1 && <div className="step-connector" />}
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── CTA BOTTOM ── */}
      <section className="cta-section">
        <motion.div
          className="cta-card glass-strong"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          <h2 className="cta-title">Ready to stop missing deadlines?</h2>
          <p className="cta-subtitle">Join Aegis AI and let your personal Chief of Staff handle the rest.</p>
          <button
            className="btn-primary btn-lg"
            onClick={handleGoogleSignIn}
            disabled={loading}
            id="bottom-google-signin"
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Start for free — Sign in with Google
          </button>
        </motion.div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="landing-footer">
        <div className="brand">
          <div className="brand-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="url(#g2)" strokeWidth="1.5" strokeLinejoin="round"/>
              <path d="M2 17l10 5 10-5" stroke="url(#g2)" strokeWidth="1.5" strokeLinejoin="round"/>
              <path d="M2 12l10 5 10-5" stroke="url(#g2)" strokeWidth="1.5" strokeLinejoin="round"/>
              <defs>
                <linearGradient id="g2" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#4f8ef7"/>
                  <stop offset="1" stopColor="#7c3aed"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
          <span className="brand-name" style={{ fontSize: '14px' }}>Aegis AI</span>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '16px' }}>
          © 2025 Aegis AI. Built with Gemini 2.5 Flash.
        </p>
      </footer>

      <style>{LANDING_STYLES}</style>
    </div>
  );
}

// ── Dashboard Preview Card Component ──

function DashboardPreviewCard() {
  return (
    <div className="preview-card glass-strong animate-float">
      <div className="preview-header">
        <div className="preview-dot red" />
        <div className="preview-dot yellow" />
        <div className="preview-dot green" />
        <span className="preview-title-bar">Aegis AI Dashboard</span>
      </div>

      <div className="preview-body">
        {/* Today's Mission */}
        <div className="preview-section">
          <div className="preview-label">🎯 Today's Mission</div>
          <div className="preview-mission">Finish Gemini API Integration</div>
          <div className="preview-sub">Most critical for hackathon submission</div>
        </div>

        {/* Goals */}
        <div className="preview-section">
          <div className="preview-label">Active Goals</div>
          {PREVIEW_GOALS.map(g => (
            <div key={g.name} className="preview-goal">
              <div className="pg-left">
                <div className="pg-name">{g.name}</div>
                <div className="pg-bar-wrap">
                  <div className="pg-bar" style={{ width: `${g.pct}%`, background: g.color }} />
                </div>
              </div>
              <div className="pg-right">
                <div className="pg-pct" style={{ color: g.color }}>{g.pct}%</div>
                <div className={`pg-risk risk-${g.risk}`}>{g.risk}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Alert */}
        <div className="preview-alert">
          <span>⚠️</span>
          <span>ML Course: 3 missed tasks. Risk increased to 58%.</span>
        </div>
      </div>
    </div>
  );
}

// ── Data ──

const PREVIEW_GOALS = [
  { name: 'Hackathon MVP', pct: 82, color: '#22c55e', risk: 'low' },
  { name: 'ML Course', pct: 56, color: '#f59e0b', risk: 'medium' },
  { name: 'DSA Prep', pct: 71, color: '#4f8ef7', risk: 'low' },
];

const FEATURES = [
  {
    icon: '🧠',
    title: 'AI Goal Decomposition',
    desc: 'Drop in a goal and a deadline. Gemini breaks it into milestones, tasks, and a daily schedule automatically.',
  },
  {
    icon: '📊',
    title: 'Real-Time Risk Prediction',
    desc: 'Every goal has a live risk score (0–100) factoring missed tasks, remaining work, and your completion history.',
  },
  {
    icon: '🔄',
    title: 'Autonomous Replanning',
    desc: 'Fell behind? The AI detects it, recalculates your timeline, and gives you a fresh plan within seconds.',
  },
  {
    icon: '✅',
    title: 'Daily Check-Ins',
    desc: 'A lightweight daily update. Mark tasks done, blocked, or partial — AI evaluates and replans from there.',
  },
  {
    icon: '🏆',
    title: 'Goal Health Score',
    desc: 'One number that tells you everything: Excellent, Good, Warning, or Critical — computed from your patterns.',
  },
  {
    icon: '💡',
    title: 'AI Coach',
    desc: 'Behavioral insights based on your actual productivity patterns. Knows when you work best and what sequence wins.',
  },
];

const STEPS = [
  { title: 'Create a Goal', desc: 'Enter your goal, deadline, and how many hours per day you can commit.' },
  { title: 'AI Builds Your Plan', desc: 'Gemini 2.5 Flash generates milestones, tasks, and a day-by-day schedule.' },
  { title: 'Execute Daily', desc: 'Get your daily mission. Mark progress in the quick check-in.' },
  { title: 'AI Monitors & Replans', desc: 'Slipped? The AI detects it and rebuilds your schedule automatically.' },
  { title: 'Complete on Time', desc: 'Hit your deadline with confidence. Aegis has your back, every step.' },
];

// ── Styles ──

const LANDING_STYLES = `
.landing-root {
  min-height: 100vh;
  position: relative;
  overflow: hidden;
}

/* Ambient orbs */
.ambient-orb {
  position: fixed;
  border-radius: 50%;
  filter: blur(80px);
  pointer-events: none;
  z-index: 0;
}
.orb-1 {
  width: 500px; height: 500px;
  background: radial-gradient(circle, rgba(79,142,247,0.12) 0%, transparent 70%);
  top: -100px; left: -100px;
}
.orb-2 {
  width: 600px; height: 600px;
  background: radial-gradient(circle, rgba(124,58,237,0.10) 0%, transparent 70%);
  bottom: -200px; right: -150px;
}
.orb-3 {
  width: 300px; height: 300px;
  background: radial-gradient(circle, rgba(79,142,247,0.08) 0%, transparent 70%);
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
}

/* Grid overlay */
.grid-overlay {
  position: fixed;
  inset: 0;
  background-image:
    linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px);
  background-size: 60px 60px;
  pointer-events: none;
  z-index: 0;
}

/* All sections above background */
nav, section, footer { position: relative; z-index: 1; }

/* ─ NAV ─ */
.landing-nav {
  position: sticky;
  top: 0;
  z-index: 100;
  padding: 0 24px;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--border-subtle);
  background: rgba(8,8,15,0.7);
}
.landing-nav-inner {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 60px;
  gap: 24px;
}
.brand {
  display: flex;
  align-items: center;
  gap: 10px;
}
.brand-icon {
  width: 34px; height: 34px;
  border-radius: 8px;
  background: rgba(79,142,247,0.1);
  border: 1px solid rgba(79,142,247,0.2);
  display: flex;
  align-items: center;
  justify-content: center;
}
.brand-name {
  font-size: 16px;
  font-weight: 700;
  letter-spacing: -0.3px;
  color: var(--text-primary);
}
.nav-links {
  display: flex;
  gap: 4px;
  flex: 1;
  justify-content: center;
}
.nav-link {
  font-size: 14px;
  color: var(--text-secondary);
  text-decoration: none;
  padding: 6px 14px;
  border-radius: var(--radius-full);
  transition: color 0.2s, background 0.2s;
}
.nav-link:hover {
  color: var(--text-primary);
  background: var(--bg-elevated);
}

/* ─ BUTTONS ─ */
.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: var(--accent-blue); color: #fff;
  color: white;
  font-weight: 600;
  border: none;
  border-radius: var(--radius-full);
  cursor: pointer;
  transition: opacity 0.2s, transform 0.15s, box-shadow 0.2s;
  white-space: nowrap;
}
.btn-primary:hover:not(:disabled) {
  opacity: 0.9;
  transform: translateY(-1px);
  box-shadow: 0 8px 24px rgba(79,142,247,0.35);
}
.btn-primary:active { transform: scale(0.98); }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-sm { font-size: 13px; padding: 8px 18px; }
.btn-lg { font-size: 15px; padding: 14px 28px; }

.btn-ghost {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: transparent;
  color: var(--text-secondary);
  font-weight: 500;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-full);
  cursor: pointer;
  transition: color 0.2s, border-color 0.2s, background 0.2s;
}
.btn-ghost:hover {
  color: var(--text-primary);
  border-color: var(--border-strong);
  background: var(--bg-elevated);
}

/* ─ HERO ─ */
.hero-section {
  max-width: 1200px;
  margin: 0 auto;
  padding: 80px 24px 100px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 80px;
  align-items: center;
  min-height: calc(100vh - 60px);
}
@media (max-width: 900px) {
  .hero-section { grid-template-columns: 1fr; gap: 60px; padding: 60px 24px; min-height: auto; }
  .hero-visual { order: -1; }
}
.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 500;
  color: var(--accent-blue);
  background: rgba(79,142,247,0.08);
  border: 1px solid rgba(79,142,247,0.2);
  padding: 6px 14px;
  border-radius: var(--radius-full);
  margin-bottom: 28px;
  letter-spacing: 0.3px;
}
.badge-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: var(--accent-blue);
  animation: pulse-glow 2s infinite;
}
.hero-title {
  font-size: clamp(40px, 5vw, 68px);
  font-weight: 800;
  line-height: 1.08;
  letter-spacing: -2px;
  margin-bottom: 24px;
}
.hero-subtitle {
  font-size: 17px;
  color: var(--text-secondary);
  line-height: 1.7;
  margin-bottom: 40px;
  max-width: 480px;
}
.hero-cta {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 48px;
}
.hero-proof {
  display: flex;
  align-items: center;
  gap: 12px;
}
.proof-avatars {
  display: flex;
}
.proof-avatar {
  width: 30px; height: 30px;
  border-radius: 50%;
  background: var(--accent-blue); color: #fff;
  border: 2px solid var(--bg-base);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  margin-right: -8px;
}
.proof-text {
  font-size: 13px;
  color: var(--text-muted);
  margin-left: 16px;
}

/* ─ PREVIEW CARD ─ */
.hero-visual {
  display: flex;
  justify-content: center;
}
.preview-card {
  width: 100%;
  max-width: 420px;
  border-radius: var(--radius-xl);
  overflow: hidden;
  box-shadow: var(--shadow-lg), var(--shadow-glow);
}
.preview-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--border-subtle);
  background: rgba(0,0,0,0.2);
}
.preview-dot {
  width: 11px; height: 11px;
  border-radius: 50%;
}
.preview-dot.red { background: #ff5f57; }
.preview-dot.yellow { background: #febc2e; }
.preview-dot.green { background: #28c840; }
.preview-title-bar {
  font-size: 12px;
  color: var(--text-muted);
  margin-left: 4px;
}
.preview-body {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.preview-section { display: flex; flex-direction: column; gap: 10px; }
.preview-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: var(--text-muted);
}
.preview-mission {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary);
}
.preview-sub {
  font-size: 12px;
  color: var(--text-muted);
}
.preview-goal {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}
.pg-left { flex: 1; display: flex; flex-direction: column; gap: 5px; }
.pg-name { font-size: 13px; font-weight: 500; color: var(--text-primary); }
.pg-bar-wrap { height: 4px; background: var(--bg-overlay); border-radius: 2px; overflow: hidden; }
.pg-bar { height: 100%; border-radius: 2px; transition: width 1s ease; }
.pg-right { display: flex; flex-direction: column; align-items: flex-end; gap: 3px; }
.pg-pct { font-size: 14px; font-weight: 700; }
.pg-risk {
  font-size: 10px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: var(--radius-full);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.risk-low { background: rgba(34,197,94,0.12); color: #22c55e; }
.risk-medium { background: rgba(245,158,11,0.12); color: #f59e0b; }
.risk-high { background: rgba(239,68,68,0.12); color: #ef4444; }
.preview-alert {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  background: rgba(245,158,11,0.08);
  border: 1px solid rgba(245,158,11,0.2);
  border-radius: var(--radius-md);
  padding: 10px 12px;
  font-size: 12px;
  color: #f59e0b;
  line-height: 1.5;
}

/* ─ SECTIONS ─ */
.features-section, .how-section {
  max-width: 1200px;
  margin: 0 auto;
  padding: 100px 24px;
}
.section-header {
  text-align: center;
  margin-bottom: 64px;
}
.section-badge {
  display: inline-block;
  font-size: 12px;
  font-weight: 600;
  color: var(--accent-blue);
  background: rgba(79,142,247,0.08);
  border: 1px solid rgba(79,142,247,0.2);
  padding: 5px 14px;
  border-radius: var(--radius-full);
  margin-bottom: 16px;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}
.section-title {
  font-size: clamp(28px, 3.5vw, 42px);
  font-weight: 800;
  letter-spacing: -1.5px;
  margin-bottom: 16px;
}
.section-subtitle {
  font-size: 16px;
  color: var(--text-secondary);
  max-width: 520px;
  margin: 0 auto;
  line-height: 1.65;
}

/* ─ FEATURES GRID ─ */
.features-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}
@media (max-width: 900px) { .features-grid { grid-template-columns: 1fr 1fr; } }
@media (max-width: 600px) { .features-grid { grid-template-columns: 1fr; } }

.feature-card {
  padding: 28px;
  border-radius: var(--radius-lg);
  transition: transform 0.2s, box-shadow 0.2s;
}
.feature-card:hover { box-shadow: var(--shadow-glow); }
.feature-icon { font-size: 28px; margin-bottom: 16px; }
.feature-title { font-size: 16px; font-weight: 700; margin-bottom: 10px; letter-spacing: -0.3px; }
.feature-desc { font-size: 14px; color: var(--text-secondary); line-height: 1.6; }

/* ─ STEPS ─ */
.steps-list {
  display: flex;
  flex-direction: column;
  gap: 0;
  max-width: 640px;
  margin: 0 auto;
  position: relative;
}
.step-item {
  display: flex;
  gap: 24px;
  align-items: flex-start;
  position: relative;
  padding-bottom: 36px;
}
.step-number {
  font-size: 12px;
  font-weight: 800;
  color: var(--accent-blue);
  background: rgba(79,142,247,0.1);
  border: 1px solid rgba(79,142,247,0.25);
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  letter-spacing: 0.5px;
}
.step-connector {
  position: absolute;
  left: 19px;
  top: 40px;
  width: 2px;
  height: calc(100% - 8px);
  background: linear-gradient(to bottom, rgba(79,142,247,0.3), transparent);
}
.step-title { font-size: 16px; font-weight: 700; margin-bottom: 6px; letter-spacing: -0.3px; }
.step-desc { font-size: 14px; color: var(--text-secondary); line-height: 1.6; }

/* ─ CTA ─ */
.cta-section {
  padding: 60px 24px 100px;
  display: flex;
  justify-content: center;
}
.cta-card {
  max-width: 680px;
  width: 100%;
  padding: 64px;
  border-radius: var(--radius-xl);
  text-align: center;
  box-shadow: var(--shadow-glow);
}
.cta-title {
  font-size: clamp(28px, 4vw, 40px);
  font-weight: 800;
  letter-spacing: -1.5px;
  margin-bottom: 16px;
}
.cta-subtitle {
  font-size: 16px;
  color: var(--text-secondary);
  margin-bottom: 36px;
  line-height: 1.6;
}

/* ─ FOOTER ─ */
.landing-footer {
  border-top: 1px solid var(--border-subtle);
  padding: 32px 24px;
  max-width: 1200px;
  margin: 0 auto;
  text-align: center;
}
`;
