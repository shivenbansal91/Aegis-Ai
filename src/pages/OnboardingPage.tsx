import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { upsertLifeContext, completeOnboarding } from '../lib/db';
import type { LifeContext, Commitment, UserRole, WorkTime } from '../types';
import { COMMITMENT_LABELS, DEFAULT_LIFE_CONTEXT } from '../types';

type Step = 0 | 1 | 2 | 3 | 4; // 0 = welcome

const COMMITMENTS: Commitment[] = [
  'college', 'dsa', 'internship', 'aiml',
  'side_projects', 'hackathons', 'competitive_programming', 'research', 'startup',
];

const ROLES: { value: UserRole; label: string; emoji: string; desc: string }[] = [
  { value: 'student', label: 'Student', emoji: '🎓', desc: 'Currently enrolled in college or university' },
  { value: 'professional', label: 'Professional', emoji: '💼', desc: 'Working full-time or part-time' },
  { value: 'founder', label: 'Founder', emoji: '🚀', desc: 'Building a startup or business' },
  { value: 'other', label: 'Other', emoji: '✦', desc: 'Learning, freelancing, or something else' },
];

const WORK_TIMES: { value: WorkTime; label: string; time: string }[] = [
  { value: 'morning', label: 'Morning Person', time: '6 AM – 12 PM' },
  { value: 'afternoon', label: 'Afternoon', time: '12 PM – 5 PM' },
  { value: 'evening', label: 'Evening', time: '5 PM – 10 PM' },
  { value: 'night', label: 'Night Owl', time: '10 PM – 2 AM' },
];

export default function OnboardingPage() {
  const { user } = useAuth();
  const [step, setStep] = React.useState<Step>(0);
  const [saving, setSaving] = React.useState(false);

  const [ctx, setCtx] = React.useState<Omit<LifeContext, 'user_id'>>({
    ...DEFAULT_LIFE_CONTEXT,
  });

  // Integrations (step 4)
  const [github, setGithub] = React.useState('');
  const [leetcode, setLeetcode] = React.useState('');

  function toggleCommitment(c: Commitment) {
    setCtx(prev => ({
      ...prev,
      active_commitments: prev.active_commitments.includes(c)
        ? prev.active_commitments.filter(x => x !== c)
        : [...prev.active_commitments, c],
    }));
  }

  async function handleFinish() {
    if (!user) return;
    setSaving(true);
    try {
      await upsertLifeContext(user.id, {
        ...ctx,
        github_username: github || undefined,
        leetcode_handle: leetcode || undefined,
      });
      await completeOnboarding(user.id);
    } catch (e) {
      console.error('Onboarding save failed:', e);
    }
    // Hard reload so useAuth re-fetches profile with onboarding_complete=true
    window.location.replace('/dashboard');
  }

  async function handleSkip() {
    if (!user) return;
    try {
      await completeOnboarding(user.id);
    } catch (e) {
      console.error('Skip failed:', e);
    }
    window.location.replace('/dashboard');
  }

  const totalSteps = 4;
  const progress = step === 0 ? 0 : (step / totalSteps) * 100;

  return (
    <div className="ob-root">
      <div className="ob-bg-orb ob-orb-1" />
      <div className="ob-bg-orb ob-orb-2" />

      {/* Progress bar */}
      {step > 0 && (
        <div className="ob-progress-bar">
          <motion.div
            className="ob-progress-fill"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        </div>
      )}

      <AnimatePresence mode="wait">

        {/* ── STEP 0: WELCOME ── */}
        {step === 0 && (
          <motion.div key="welcome" className="ob-card"
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>

            <div className="ob-logo">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="url(#og)" strokeWidth="1.5" strokeLinejoin="round"/>
                <path d="M2 17l10 5 10-5" stroke="url(#og)" strokeWidth="1.5" strokeLinejoin="round"/>
                <path d="M2 12l10 5 10-5" stroke="url(#og)" strokeWidth="1.5" strokeLinejoin="round"/>
                <defs>
                  <linearGradient id="og" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#4f8ef7"/><stop offset="1" stopColor="#7c3aed"/>
                  </linearGradient>
                </defs>
              </svg>
              <span className="ob-logo-name">Aegis AI</span>
            </div>

            <div className="ob-welcome-content">
              <h1 className="ob-welcome-title">Welcome{user?.user_metadata?.full_name ? `, ${user.user_metadata.full_name.split(' ')[0]}` : ''}.</h1>
              <p className="ob-welcome-sub">
                Your AI Chief of Staff is ready.<br/>
                A 2-minute setup helps Aegis give you sharper, more relevant advice.
              </p>

              <div className="ob-welcome-features">
                {[
                  ['🎯', 'Strategic plans', 'tailored to your schedule and goals'],
                  ['⚡', 'Smarter prioritization', 'based on your current commitments'],
                  ['📊', 'Honest risk assessment', 'so you finish before deadlines'],
                ].map(([icon, title, desc]) => (
                  <div key={title} className="ob-feature-row">
                    <span className="ob-feature-icon">{icon}</span>
                    <div>
                      <div className="ob-feature-title">{title}</div>
                      <div className="ob-feature-desc">{desc}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="ob-welcome-actions">
                <button className="ob-btn-primary" onClick={() => setStep(1)}>
                  Complete Setup
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </button>
                <button className="ob-btn-ghost" onClick={handleSkip}>
                  Skip for now
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── STEP 1: ACADEMIC PROFILE ── */}
        {step === 1 && (
          <motion.div key="step1" className="ob-card"
            initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}>

            <div className="ob-step-label">Step 1 of 4</div>
            <h2 className="ob-step-title">Who are you?</h2>
            <p className="ob-step-sub">This helps Aegis understand your context and calibrate its advice.</p>

            <div className="ob-role-grid">
              {ROLES.map(r => (
                <button
                  key={r.value}
                  className={`ob-role-card ${ctx.role === r.value ? 'selected' : ''}`}
                  onClick={() => setCtx(p => ({ ...p, role: r.value }))}
                >
                  <span className="ob-role-emoji">{r.emoji}</span>
                  <div className="ob-role-label">{r.label}</div>
                  <div className="ob-role-desc">{r.desc}</div>
                </button>
              ))}
            </div>

            {ctx.role === 'student' && (
              <motion.div className="ob-student-fields"
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                <div className="ob-fields-row">
                  <div className="ob-field">
                    <label className="ob-label">University <span className="ob-optional">optional</span></label>
                    <input className="ob-input" placeholder="e.g. IIT Bombay, BITS Pilani"
                      value={ctx.university ?? ''} onChange={e => setCtx(p => ({ ...p, university: e.target.value }))} />
                  </div>
                </div>
                <div className="ob-fields-row">
                  <div className="ob-field">
                    <label className="ob-label">Current Semester</label>
                    <select className="ob-select" value={ctx.current_semester ?? ''}
                      onChange={e => setCtx(p => ({ ...p, current_semester: Number(e.target.value) || undefined }))}>
                      <option value="">Select</option>
                      {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
                    </select>
                  </div>
                  <div className="ob-field">
                    <label className="ob-label">Graduation Year</label>
                    <select className="ob-select" value={ctx.graduation_year ?? ''}
                      onChange={e => setCtx(p => ({ ...p, graduation_year: Number(e.target.value) || undefined }))}>
                      <option value="">Select</option>
                      {[2025,2026,2027,2028,2029,2030].map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                </div>
              </motion.div>
            )}

            <div className="ob-nav">
              <button className="ob-btn-ghost" onClick={() => setStep(0)}>← Back</button>
              <button className="ob-btn-primary" onClick={() => setStep(2)}>Continue →</button>
            </div>
          </motion.div>
        )}

        {/* ── STEP 2: COMMITMENTS ── */}
        {step === 2 && (
          <motion.div key="step2" className="ob-card"
            initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}>

            <div className="ob-step-label">Step 2 of 4</div>
            <h2 className="ob-step-title">What are you working on?</h2>
            <p className="ob-step-sub">Select everything that's currently on your plate. Be honest — the more accurate this is, the better the AI plans.</p>

            <div className="ob-commitment-grid">
              {COMMITMENTS.map(c => {
                const selected = ctx.active_commitments.includes(c);
                return (
                  <button key={c} className={`ob-commitment-chip ${selected ? 'selected' : ''}`}
                    onClick={() => toggleCommitment(c)}>
                    {selected && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    )}
                    {COMMITMENT_LABELS[c]}
                  </button>
                );
              })}
            </div>

            {ctx.active_commitments.length > 0 && (
              <div className="ob-selection-note">
                {ctx.active_commitments.length} commitment{ctx.active_commitments.length > 1 ? 's' : ''} selected — Aegis will balance these in your plans.
              </div>
            )}

            <div className="ob-nav">
              <button className="ob-btn-ghost" onClick={() => setStep(1)}>← Back</button>
              <button className="ob-btn-primary" onClick={() => setStep(3)}>Continue →</button>
            </div>
          </motion.div>
        )}

        {/* ── STEP 3: SCHEDULE ── */}
        {step === 3 && (
          <motion.div key="step3" className="ob-card"
            initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}>

            <div className="ob-step-label">Step 3 of 4</div>
            <h2 className="ob-step-title">Your schedule</h2>
            <p className="ob-step-sub">Aegis uses this to schedule tasks within your actual availability.</p>

            <div className="ob-schedule-section">
              <label className="ob-label">Average free hours per day</label>
              <div className="ob-hours-row">
                {[1, 2, 3, 4, 5, 6, 8].map(h => (
                  <button key={h} className={`ob-hour-btn ${ctx.avg_free_hours_per_day === h ? 'selected' : ''}`}
                    onClick={() => setCtx(p => ({ ...p, avg_free_hours_per_day: h }))}>
                    {h}h
                  </button>
                ))}
              </div>
            </div>

            <div className="ob-schedule-section">
              <label className="ob-label">When do you do your best work?</label>
              <div className="ob-work-time-grid">
                {WORK_TIMES.map(w => (
                  <button key={w.value}
                    className={`ob-work-time-card ${ctx.preferred_work_time === w.value ? 'selected' : ''}`}
                    onClick={() => setCtx(p => ({ ...p, preferred_work_time: w.value }))}>
                    <div className="ob-wt-label">{w.label}</div>
                    <div className="ob-wt-time">{w.time}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="ob-schedule-section">
              <div className="ob-toggle-row">
                <div>
                  <div className="ob-label" style={{ marginBottom: 2 }}>Available on weekends?</div>
                  <div className="ob-toggle-desc">If yes, tasks may be scheduled on Sat/Sun.</div>
                </div>
                <button
                  className={`ob-toggle ${ctx.weekend_available ? 'on' : 'off'}`}
                  onClick={() => setCtx(p => ({ ...p, weekend_available: !p.weekend_available }))}>
                  <div className="ob-toggle-knob" />
                </button>
              </div>
            </div>

            <div className="ob-nav">
              <button className="ob-btn-ghost" onClick={() => setStep(2)}>← Back</button>
              <button className="ob-btn-primary" onClick={() => setStep(4)}>Continue →</button>
            </div>
          </motion.div>
        )}

        {/* ── STEP 4: INTEGRATIONS ── */}
        {step === 4 && (
          <motion.div key="step4" className="ob-card"
            initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}>

            <div className="ob-step-label">Step 4 of 4</div>
            <h2 className="ob-step-title">Connect your tools</h2>
            <p className="ob-step-sub">Aegis verifies your progress automatically during Daily Reviews. All optional — you can connect later in Settings.</p>

            <div className="ob-integrations">
              <div className="ob-integration-card">
                <div className="ob-int-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
                  </svg>
                </div>
                <div className="ob-int-info">
                  <div className="ob-int-name">GitHub</div>
                  <div className="ob-int-desc">Verify commits & PRs during Daily Reviews</div>
                </div>
                <input className="ob-int-input" placeholder="username"
                  value={github} onChange={e => setGithub(e.target.value)} />
              </div>

              <div className="ob-integration-card">
                <div className="ob-int-icon ob-int-lc">⚡</div>
                <div className="ob-int-info">
                  <div className="ob-int-name">LeetCode</div>
                  <div className="ob-int-desc">Verify problems solved during Daily Reviews</div>
                </div>
                <input className="ob-int-input" placeholder="username"
                  value={leetcode} onChange={e => setLeetcode(e.target.value)} />
              </div>

              <div className="ob-integration-coming">
                <div className="ob-int-icon ob-int-dim">📅</div>
                <div className="ob-int-info">
                  <div className="ob-int-name" style={{ opacity: 0.5 }}>Google Calendar</div>
                  <div className="ob-int-desc">Coming soon</div>
                </div>
                <span className="ob-coming-badge">Soon</span>
              </div>
            </div>

            <div className="ob-nav">
              <button className="ob-btn-ghost" onClick={() => setStep(3)}>← Back</button>
              <button className="ob-btn-primary" onClick={() => handleFinish()} disabled={saving}>
                {saving ? 'Setting up…' : 'Launch Aegis →'}
              </button>
            </div>
            <button className="ob-skip-link" onClick={handleSkip}>Skip integrations</button>
          </motion.div>
        )}

      </AnimatePresence>

      {/* Dot indicators */}
      {step > 0 && (
        <div className="ob-dots">
          {[1,2,3,4].map(i => (
            <div key={i} className={`ob-dot ${step >= i ? 'active' : ''} ${step === i ? 'current' : ''}`} />
          ))}
        </div>
      )}

      <style>{OB_STYLES}</style>
    </div>
  );
}

const OB_STYLES = `
.ob-root {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px;
  position: relative;
  overflow: hidden;
  background: var(--bg-base);
}

.ob-bg-orb {
  position: fixed;
  border-radius: 50%;
  filter: blur(100px);
  pointer-events: none;
  z-index: 0;
}
.ob-orb-1 {
  width: 600px; height: 600px;
  background: radial-gradient(circle, rgba(79,142,247,0.08) 0%, transparent 70%);
  top: -200px; left: -100px;
}
.ob-orb-2 {
  width: 500px; height: 500px;
  background: radial-gradient(circle, rgba(124,58,237,0.07) 0%, transparent 70%);
  bottom: -150px; right: -100px;
}

/* Progress bar */
.ob-progress-bar {
  position: fixed;
  top: 0; left: 0; right: 0;
  height: 2px;
  background: var(--border-subtle);
  z-index: 100;
}
.ob-progress-fill {
  height: 100%;
  background: var(--accent-blue); color: #fff;
}

/* Card */
.ob-card {
  width: 100%;
  max-width: 520px;
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* Logo */
.ob-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}
.ob-logo-name {
  font-size: 17px;
  font-weight: 800;
  letter-spacing: -0.5px;
}

/* Welcome */
.ob-welcome-content { display: flex; flex-direction: column; gap: 28px; }
.ob-welcome-title {
  font-size: 40px;
  font-weight: 800;
  letter-spacing: -2px;
  line-height: 1.1;
  background: linear-gradient(135deg, #fff 40%, rgba(255,255,255,0.5));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.ob-welcome-sub {
  font-size: 15px;
  color: var(--text-secondary);
  line-height: 1.65;
}
.ob-welcome-features { display: flex; flex-direction: column; gap: 14px; }
.ob-feature-row { display: flex; align-items: flex-start; gap: 14px; }
.ob-feature-icon { font-size: 20px; width: 28px; flex-shrink: 0; margin-top: 1px; }
.ob-feature-title { font-size: 14px; font-weight: 600; color: var(--text-primary); }
.ob-feature-desc { font-size: 13px; color: var(--text-muted); margin-top: 1px; }

.ob-welcome-actions { display: flex; flex-direction: column; gap: 10px; }

/* Step header */
.ob-step-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--text-disabled);
}
.ob-step-title {
  font-size: 28px;
  font-weight: 800;
  letter-spacing: -1px;
  line-height: 1.2;
  margin-top: -8px;
}
.ob-step-sub {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.6;
  margin-top: -8px;
}

/* Role grid */
.ob-role-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.ob-role-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  padding: 16px;
  border-radius: 12px;
  border: 1px solid var(--border-default);
  background: var(--bg-surface);
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
  text-align: left;
  font-family: 'Inter', sans-serif;
}
.ob-role-card:hover { border-color: var(--border-strong); }
.ob-role-card.selected {
  border-color: var(--accent-blue);
  background: rgba(79,142,247,0.06);
}
.ob-role-emoji { font-size: 22px; }
.ob-role-label { font-size: 14px; font-weight: 700; color: var(--text-primary); }
.ob-role-desc { font-size: 12px; color: var(--text-muted); line-height: 1.4; }

/* Student fields */
.ob-student-fields { display: flex; flex-direction: column; gap: 12px; overflow: hidden; }
.ob-fields-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.ob-field { display: flex; flex-direction: column; gap: 6px; }
.ob-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.ob-optional { font-weight: 400; text-transform: none; letter-spacing: 0; color: var(--text-disabled); }
.ob-input, .ob-select {
  background: var(--bg-elevated);
  border: 1px solid var(--border-default);
  border-radius: 8px;
  padding: 10px 12px;
  color: var(--text-primary);
  font-size: 14px;
  font-family: 'Inter', sans-serif;
  outline: none;
  transition: border-color 0.15s;
}
.ob-input:focus, .ob-select:focus { border-color: var(--accent-blue); }
.ob-input::placeholder { color: var(--text-disabled); }
.ob-select { cursor: pointer; }

/* Commitment grid */
.ob-commitment-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.ob-commitment-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: var(--radius-full);
  border: 1px solid var(--border-default);
  background: var(--bg-surface);
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  font-family: 'Inter', sans-serif;
  transition: all 0.15s;
}
.ob-commitment-chip:hover { border-color: var(--border-strong); color: var(--text-primary); }
.ob-commitment-chip.selected {
  border-color: var(--accent-blue);
  background: rgba(79,142,247,0.08);
  color: var(--accent-blue);
}
.ob-selection-note {
  font-size: 12px;
  color: var(--text-muted);
  padding: 8px 0;
}

/* Schedule */
.ob-schedule-section { display: flex; flex-direction: column; gap: 10px; }
.ob-hours-row { display: flex; gap: 8px; flex-wrap: wrap; }
.ob-hour-btn {
  padding: 8px 16px;
  border-radius: 8px;
  border: 1px solid var(--border-default);
  background: var(--bg-surface);
  color: var(--text-secondary);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  font-family: 'Inter', sans-serif;
  transition: all 0.15s;
}
.ob-hour-btn:hover { border-color: var(--border-strong); color: var(--text-primary); }
.ob-hour-btn.selected {
  border-color: var(--accent-blue);
  background: rgba(79,142,247,0.08);
  color: var(--accent-blue);
}

.ob-work-time-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.ob-work-time-card {
  padding: 12px;
  border-radius: 10px;
  border: 1px solid var(--border-default);
  background: var(--bg-surface);
  cursor: pointer;
  text-align: left;
  font-family: 'Inter', sans-serif;
  transition: all 0.15s;
}
.ob-work-time-card:hover { border-color: var(--border-strong); }
.ob-work-time-card.selected {
  border-color: var(--accent-blue);
  background: rgba(79,142,247,0.06);
}
.ob-wt-label { font-size: 13px; font-weight: 700; color: var(--text-primary); }
.ob-wt-time { font-size: 11px; color: var(--text-muted); margin-top: 2px; }

.ob-toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 16px;
  background: var(--bg-surface);
  border: 1px solid var(--border-default);
  border-radius: 10px;
}
.ob-toggle-desc { font-size: 12px; color: var(--text-muted); }
.ob-toggle {
  width: 44px; height: 26px;
  border-radius: 13px;
  border: none;
  cursor: pointer;
  position: relative;
  transition: background 0.2s;
  flex-shrink: 0;
}
.ob-toggle.on { background: var(--accent-blue); }
.ob-toggle.off { background: var(--border-strong); }
.ob-toggle-knob {
  width: 20px; height: 20px;
  border-radius: 50%;
  background: white;
  position: absolute;
  top: 3px;
  transition: left 0.2s;
}
.ob-toggle.on .ob-toggle-knob { left: 21px; }
.ob-toggle.off .ob-toggle-knob { left: 3px; }

/* Integrations */
.ob-integrations { display: flex; flex-direction: column; gap: 10px; }
.ob-integration-card, .ob-integration-coming {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  background: var(--bg-surface);
  border: 1px solid var(--border-default);
  border-radius: 12px;
}
.ob-int-icon {
  width: 36px; height: 36px;
  border-radius: 8px;
  background: rgba(255,255,255,0.06);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
  color: var(--text-primary);
}
.ob-int-lc { font-size: 20px; }
.ob-int-dim { opacity: 0.4; }
.ob-int-info { flex: 1; }
.ob-int-name { font-size: 14px; font-weight: 600; color: var(--text-primary); }
.ob-int-desc { font-size: 12px; color: var(--text-muted); margin-top: 1px; }
.ob-int-input {
  width: 140px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-default);
  border-radius: 7px;
  padding: 7px 10px;
  color: var(--text-primary);
  font-size: 13px;
  font-family: 'Inter', sans-serif;
  outline: none;
  transition: border-color 0.15s;
}
.ob-int-input:focus { border-color: var(--accent-blue); }
.ob-int-input::placeholder { color: var(--text-disabled); }
.ob-coming-badge {
  font-size: 11px;
  font-weight: 600;
  color: #f59e0b;
  background: rgba(245,158,11,0.08);
  border: 1px solid rgba(245,158,11,0.2);
  padding: 3px 8px;
  border-radius: var(--radius-full);
}

.ob-skip-link {
  background: none;
  border: none;
  color: var(--text-disabled);
  font-size: 12px;
  cursor: pointer;
  font-family: 'Inter', sans-serif;
  padding: 8px;
  transition: color 0.15s;
  text-align: center;
}
.ob-skip-link:hover { color: var(--text-muted); }

/* Buttons */
.ob-btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 13px 28px;
  background: var(--accent-blue); color: #fff;
  color: white;
  border: none;
  border-radius: var(--radius-full);
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  font-family: 'Inter', sans-serif;
  transition: opacity 0.2s, transform 0.15s, box-shadow 0.2s;
  width: 100%;
}
.ob-btn-primary:hover:not(:disabled) {
  opacity: 0.9;
  transform: translateY(-1px);
  box-shadow: 0 8px 24px rgba(79,142,247,0.35);
}
.ob-btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

.ob-btn-ghost {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 13px 28px;
  background: transparent;
  color: var(--text-muted);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-full);
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  font-family: 'Inter', sans-serif;
  transition: all 0.15s;
  width: 100%;
}
.ob-btn-ghost:hover { color: var(--text-primary); border-color: var(--border-strong); }

/* Nav */
.ob-nav {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 10px;
}

/* Dots */
.ob-dots {
  display: flex;
  gap: 6px;
  margin-top: 32px;
  position: relative;
  z-index: 1;
}
.ob-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: var(--border-strong);
  transition: all 0.3s;
}
.ob-dot.active { background: var(--accent-blue); opacity: 0.5; }
.ob-dot.current { width: 20px; border-radius: 3px; background: var(--accent-blue); opacity: 1; }
`;
