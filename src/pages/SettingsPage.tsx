import React from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { verifyGitHub, verifyLeetCode } from '../lib/verify';
import { upsertLifeContext, getLifeContext } from '../lib/db';
import type { LifeContext, Commitment, UserRole, WorkTime } from '../types';
import { COMMITMENT_LABELS } from '../types';

const COMMITMENTS: Commitment[] = [
  'college', 'dsa', 'internship', 'aiml',
  'side_projects', 'hackathons', 'competitive_programming', 'research', 'startup',
];

const WORK_TIMES: { value: WorkTime; label: string }[] = [
  { value: 'morning', label: 'Morning (6AM–12PM)' },
  { value: 'afternoon', label: 'Afternoon (12–5PM)' },
  { value: 'evening', label: 'Evening (5–10PM)' },
  { value: 'night', label: 'Night Owl (10PM–2AM)' },
];

type Tab = 'profile' | 'life_context' | 'integrations';

export default function SettingsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = React.useState<Tab>('profile');

  // Profile form
  const [form, setForm] = React.useState({
    display_name: '',
    github_username: '',
    leetcode_handle: '',
    preferred_work_start: 9,
    preferred_work_end: 21,
  });
  const [loadingProfile, setLoadingProfile] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Life Context form
  const [lc, setLc] = React.useState<Omit<LifeContext, 'user_id'>>({
    role: 'student',
    active_commitments: [],
    avg_free_hours_per_day: 3,
    preferred_work_time: 'evening',
    weekend_available: true,
  });
  const [lcSaving, setLcSaving] = React.useState(false);
  const [lcSaved, setLcSaved] = React.useState(false);

  // Integration test states
  const [testingGH, setTestingGH] = React.useState(false);
  const [testingLC, setTestingLC] = React.useState(false);
  const [ghResult, setGhResult] = React.useState<string | null>(null);
  const [lcResult, setLcResult] = React.useState<string | null>(null);

  // Load profile + life context
  React.useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from('profiles')
        .select('display_name, github_username, leetcode_handle, preferred_work_start, preferred_work_end')
        .eq('id', user.id).single(),
      getLifeContext(user.id),
    ]).then(([{ data: profile }, lifeCtx]) => {
      if (profile) {
        setForm({
          display_name: profile.display_name ?? '',
          github_username: profile.github_username ?? '',
          leetcode_handle: profile.leetcode_handle ?? '',
          preferred_work_start: profile.preferred_work_start ?? 9,
          preferred_work_end: profile.preferred_work_end ?? 21,
        });
      }
      if (lifeCtx) {
        setLc({
          role: lifeCtx.role ?? 'student',
          university: lifeCtx.university,
          current_semester: lifeCtx.current_semester,
          graduation_year: lifeCtx.graduation_year,
          active_commitments: lifeCtx.active_commitments ?? [],
          avg_free_hours_per_day: lifeCtx.avg_free_hours_per_day ?? 3,
          preferred_work_time: lifeCtx.preferred_work_time ?? 'evening',
          weekend_available: lifeCtx.weekend_available ?? true,
          github_username: lifeCtx.github_username,
          leetcode_handle: lifeCtx.leetcode_handle,
        });
      }
      setLoadingProfile(false);
    });
  }, [user]);

  async function handleSaveProfile() {
    if (!user) return;
    setSaving(true); setError(null); setSaved(false);
    const { error: err } = await supabase.from('profiles').update({
      display_name: form.display_name,
      github_username: form.github_username || null,
      leetcode_handle: form.leetcode_handle || null,
      preferred_work_start: form.preferred_work_start,
      preferred_work_end: form.preferred_work_end,
    }).eq('id', user.id);
    setSaving(false);
    if (err) { setError(err.message); } else { setSaved(true); setTimeout(() => setSaved(false), 3000); }
  }

  async function handleSaveLifeContext() {
    if (!user) return;
    setLcSaving(true);
    try {
      await upsertLifeContext(user.id, lc);
      setLcSaved(true);
      setTimeout(() => setLcSaved(false), 3000);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLcSaving(false);
    }
  }

  function toggleCommitment(c: Commitment) {
    setLc(prev => ({
      ...prev,
      active_commitments: prev.active_commitments.includes(c)
        ? prev.active_commitments.filter(x => x !== c)
        : [...prev.active_commitments, c],
    }));
  }

  async function testGitHub() {
    if (!form.github_username.trim()) return;
    setTestingGH(true); setGhResult(null);
    const r = await verifyGitHub(form.github_username.trim());
    setGhResult(r.error ? `❌ ${r.error}` :
      `✅ Connected! Today: ${r.commitsToday} commit${r.commitsToday !== 1 ? 's' : ''}` +
      (r.repos.length > 0 ? ` in ${r.repos.slice(0, 2).join(', ')}` : '') +
      (r.prsOpened > 0 ? `, ${r.prsOpened} PR` : ''));
    setTestingGH(false);
  }

  async function testLeetCode() {
    if (!form.leetcode_handle.trim()) return;
    setTestingLC(true); setLcResult(null);
    const r = await verifyLeetCode(form.leetcode_handle.trim());
    setLcResult(r.error ? `❌ ${r.error}` :
      `✅ Connected! Total: ${r.totalSolved}. Streak: ${r.streak} days.` +
      (r.solvedToday > 0 ? ` Today: ${r.solvedToday} problem(s).` : ''));
    setTestingLC(false);
  }

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const fmtHour = (h: number) =>
    h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`;

  const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: 'profile', label: 'Profile', icon: '👤' },
    { id: 'life_context', label: 'Life Context', icon: '🧭' },
    { id: 'integrations', label: 'Integrations', icon: '🔗' },
  ];

  return (
    <div className="settings-root">
      <div className="settings-container">
        <div className="settings-header">
          <h1 className="settings-title">Settings</h1>
          <p className="settings-subtitle">Your profile, context, and connected tools.</p>
        </div>

        {/* Tab Bar */}
        <div className="settings-tabs">
          {TABS.map(t => (
            <button
              key={t.id}
              className={`settings-tab ${activeTab === t.id ? 'active' : ''}`}
              onClick={() => setActiveTab(t.id)}
            >
              <span>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── PROFILE TAB ── */}
        {activeTab === 'profile' && (
          <motion.div key="profile" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
            <div className="settings-section glass">
              <div className="settings-section-title"><span className="section-icon">👤</span>Profile</div>
              <div className="settings-fields">
                <div className="field-group">
                  <label className="field-label">Display Name</label>
                  <input className="field-input" value={form.display_name}
                    onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))}
                    placeholder="Your name" />
                </div>
                <div className="field-group">
                  <label className="field-label">Email</label>
                  <input className="field-input" value={user?.email ?? ''} disabled />
                </div>
              </div>
            </div>

            <div className="settings-section glass" style={{ marginTop: 16 }}>
              <div className="settings-section-title">
                <span className="section-icon">🕐</span>Work Hours
                <span className="section-badge">Used for scheduling tasks</span>
              </div>
              <div className="settings-row">
                <div className="field-group">
                  <label className="field-label">Work Start</label>
                  <select className="field-select" value={form.preferred_work_start}
                    onChange={e => setForm(f => ({ ...f, preferred_work_start: Number(e.target.value) }))}>
                    {hours.map(h => <option key={h} value={h}>{fmtHour(h)}</option>)}
                  </select>
                </div>
                <div className="field-group">
                  <label className="field-label">Work End</label>
                  <select className="field-select" value={form.preferred_work_end}
                    onChange={e => setForm(f => ({ ...f, preferred_work_end: Number(e.target.value) }))}>
                    {hours.map(h => <option key={h} value={h}>{fmtHour(h)}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {error && <div className="settings-error">{error}</div>}
            <div className="settings-actions">
              <button className="save-btn" onClick={handleSaveProfile} disabled={saving}>
                {saving ? <><span className="mini-spinner white" />Saving…</> : saved ? <>✓ Saved!</> : <>Save Profile</>}
              </button>
            </div>
          </motion.div>
        )}

        {/* ── LIFE CONTEXT TAB ── */}
        {activeTab === 'life_context' && (
          <motion.div key="lc" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>

            {/* Who are you */}
            <div className="settings-section glass">
              <div className="settings-section-title"><span className="section-icon">🎓</span>Academic Profile</div>
              <div className="lc-role-row">
                {(['student', 'professional', 'founder', 'other'] as UserRole[]).map(r => (
                  <button key={r} className={`lc-role-btn ${lc.role === r ? 'active' : ''}`}
                    onClick={() => setLc(p => ({ ...p, role: r }))}>
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </button>
                ))}
              </div>
              {lc.role === 'student' && (
                <div className="settings-fields">
                  <div className="field-group">
                    <label className="field-label">University <span className="opt-tag">optional</span></label>
                    <input className="field-input" placeholder="e.g. IIT Bombay"
                      value={lc.university ?? ''}
                      onChange={e => setLc(p => ({ ...p, university: e.target.value }))} />
                  </div>
                  <div className="settings-row">
                    <div className="field-group">
                      <label className="field-label">Current Semester</label>
                      <select className="field-select" value={lc.current_semester ?? ''}
                        onChange={e => setLc(p => ({ ...p, current_semester: Number(e.target.value) || undefined }))}>
                        <option value="">—</option>
                        {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
                      </select>
                    </div>
                    <div className="field-group">
                      <label className="field-label">Graduation Year</label>
                      <select className="field-select" value={lc.graduation_year ?? ''}
                        onChange={e => setLc(p => ({ ...p, graduation_year: Number(e.target.value) || undefined }))}>
                        <option value="">—</option>
                        {[2025,2026,2027,2028,2029,2030].map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Commitments */}
            <div className="settings-section glass" style={{ marginTop: 16 }}>
              <div className="settings-section-title"><span className="section-icon">⚡</span>Current Commitments</div>
              <p className="lc-desc">Everything currently on your plate. Aegis balances these when planning.</p>
              <div className="lc-chips">
                {COMMITMENTS.map(c => {
                  const on = lc.active_commitments.includes(c);
                  return (
                    <button key={c} className={`lc-chip ${on ? 'on' : ''}`} onClick={() => toggleCommitment(c)}>
                      {on && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                      {COMMITMENT_LABELS[c]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Schedule */}
            <div className="settings-section glass" style={{ marginTop: 16 }}>
              <div className="settings-section-title"><span className="section-icon">📅</span>Schedule</div>
              <div className="field-group">
                <label className="field-label">Average free hours per day</label>
                <div className="lc-hours-row">
                  {[1,2,3,4,5,6,8].map(h => (
                    <button key={h} className={`lc-hour-btn ${lc.avg_free_hours_per_day === h ? 'active' : ''}`}
                      onClick={() => setLc(p => ({ ...p, avg_free_hours_per_day: h }))}>
                      {h}h
                    </button>
                  ))}
                </div>
              </div>
              <div className="field-group">
                <label className="field-label">Preferred work time</label>
                <select className="field-select" value={lc.preferred_work_time}
                  onChange={e => setLc(p => ({ ...p, preferred_work_time: e.target.value as WorkTime }))}>
                  {WORK_TIMES.map(w => <option key={w.value} value={w.value}>{w.label}</option>)}
                </select>
              </div>
              <div className="lc-toggle-row">
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Available on weekends</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Allows tasks to be scheduled Sat/Sun</div>
                </div>
                <button className={`lc-toggle ${lc.weekend_available ? 'on' : 'off'}`}
                  onClick={() => setLc(p => ({ ...p, weekend_available: !p.weekend_available }))}>
                  <div className="lc-toggle-knob" />
                </button>
              </div>
            </div>

            <div className="settings-actions">
              <button className="save-btn" onClick={handleSaveLifeContext} disabled={lcSaving}>
                {lcSaving ? <><span className="mini-spinner white" />Saving…</> : lcSaved ? <>✓ Saved!</> : <>Save Life Context</>}
              </button>
            </div>
          </motion.div>
        )}

        {/* ── INTEGRATIONS TAB ── */}
        {activeTab === 'integrations' && (
          <motion.div key="integrations" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>

            {/* GitHub */}
            <div className="settings-section glass">
              <div className="settings-section-title">
                <span className="section-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
                  </svg>
                </span>
                GitHub
                <span className="section-badge">Verifies commits during Daily Reviews</span>
              </div>
              <div className="field-row">
                <div className="field-group" style={{ flex: 1 }}>
                  <label className="field-label">Username</label>
                  <input className="field-input" placeholder="e.g. torvalds"
                    value={form.github_username}
                    onChange={e => setForm(f => ({ ...f, github_username: e.target.value }))} />
                </div>
                <button className="test-btn" onClick={testGitHub} disabled={testingGH || !form.github_username.trim()}>
                  {testingGH ? <span className="mini-spinner" /> : '🔍 Test'}
                </button>
              </div>
              {ghResult && <div className={`test-result ${ghResult.startsWith('✅') ? 'success' : 'error'}`}>{ghResult}</div>}
            </div>

            {/* LeetCode */}
            <div className="settings-section glass" style={{ marginTop: 16 }}>
              <div className="settings-section-title">
                <span className="section-icon">⚡</span>
                LeetCode
                <span className="section-badge">Verifies problems during Daily Reviews</span>
              </div>
              <div className="field-row">
                <div className="field-group" style={{ flex: 1 }}>
                  <label className="field-label">Username</label>
                  <input className="field-input" placeholder="e.g. neal_wu"
                    value={form.leetcode_handle}
                    onChange={e => setForm(f => ({ ...f, leetcode_handle: e.target.value }))} />
                </div>
                <button className="test-btn" onClick={testLeetCode} disabled={testingLC || !form.leetcode_handle.trim()}>
                  {testingLC ? <span className="mini-spinner" /> : '🔍 Test'}
                </button>
              </div>
              {lcResult && <div className={`test-result ${lcResult.startsWith('✅') ? 'success' : 'error'}`}>{lcResult}</div>}
            </div>

            {/* Coming Soon */}
            <div className="settings-section glass settings-coming-soon" style={{ marginTop: 16 }}>
              <div className="settings-section-title">
                <span className="section-icon">📅</span>Google Calendar
                <span className="section-badge coming">Coming soon</span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                Aegis will read your calendar to schedule tasks in actual free slots, not just estimated hours.
              </div>
            </div>

            {error && <div className="settings-error" style={{ marginTop: 16 }}>{error}</div>}
            <div className="settings-actions">
              <button className="save-btn" onClick={handleSaveProfile} disabled={saving}>
                {saving ? <><span className="mini-spinner white" />Saving…</> : saved ? <>✓ Saved!</> : <>Save Integrations</>}
              </button>
            </div>
          </motion.div>
        )}
      </div>

      <style>{SETTINGS_STYLES}</style>
    </div>
  );
}

const SETTINGS_STYLES = `
.settings-root { padding: 32px; min-height: 100vh; }
.settings-container { max-width: 680px; margin: 0 auto; display: flex; flex-direction: column; gap: 0; }
.settings-header { margin-bottom: 24px; }
.settings-title { font-size: 28px; font-weight: 800; letter-spacing: -1px; margin-bottom: 4px; }
.settings-subtitle { font-size: 14px; color: var(--text-muted); }

/* Tabs */
.settings-tabs {
  display: flex;
  gap: 4px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  padding: 4px;
  margin-bottom: 20px;
}
.settings-tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 9px 16px;
  border-radius: calc(var(--radius-lg) - 4px);
  border: none;
  background: transparent;
  color: var(--text-muted);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  font-family: 'Inter', sans-serif;
  transition: background 0.15s, color 0.15s;
}
.settings-tab:hover:not(.active) { color: var(--text-secondary); background: var(--bg-overlay); }
.settings-tab.active {
  background: var(--bg-surface);
  color: var(--text-primary);
  border: 1px solid var(--border-default);
  box-shadow: 0 1px 4px rgba(0,0,0,0.15);
}

.settings-section {
  border-radius: var(--radius-lg);
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.settings-coming-soon { opacity: 0.6; }
.settings-section-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
}
.section-icon { font-size: 18px; display: flex; align-items: center; }
.section-badge {
  font-size: 11px;
  font-weight: 500;
  color: var(--text-muted);
  background: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
  padding: 2px 8px;
  border-radius: var(--radius-full);
  margin-left: auto;
}
.section-badge.coming {
  color: #f59e0b;
  background: rgba(245,158,11,0.08);
  border-color: rgba(245,158,11,0.2);
}

.settings-fields { display: flex; flex-direction: column; gap: 12px; }
.settings-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }

.field-group { display: flex; flex-direction: column; gap: 6px; }
.field-label { font-size: 12px; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; }
.opt-tag { font-weight: 400; text-transform: none; letter-spacing: 0; color: var(--text-disabled); margin-left: 4px; }
.field-input, .field-select {
  background: var(--bg-elevated);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  padding: 10px 14px;
  color: var(--text-primary);
  font-size: 14px;
  font-family: 'Inter', sans-serif;
  outline: none;
  transition: border-color 0.2s;
  width: 100%;
}
.field-input:focus, .field-select:focus { border-color: var(--accent-blue); }
.field-input:disabled { opacity: 0.5; cursor: not-allowed; }
.field-input::placeholder { color: var(--text-disabled); }
.field-select { cursor: pointer; }

.field-row { display: flex; gap: 12px; align-items: flex-end; }

/* Life Context */
.lc-desc { font-size: 13px; color: var(--text-muted); line-height: 1.6; margin-top: -4px; }

.lc-role-row { display: flex; gap: 8px; flex-wrap: wrap; }
.lc-role-btn {
  padding: 8px 16px;
  border-radius: var(--radius-full);
  border: 1px solid var(--border-default);
  background: var(--bg-elevated);
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  font-family: 'Inter', sans-serif;
  transition: all 0.15s;
}
.lc-role-btn:hover { border-color: var(--border-strong); color: var(--text-primary); }
.lc-role-btn.active {
  border-color: var(--accent-blue);
  background: rgba(79,142,247,0.08);
  color: var(--accent-blue);
}

.lc-chips { display: flex; flex-wrap: wrap; gap: 8px; }
.lc-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 7px 14px;
  border-radius: var(--radius-full);
  border: 1px solid var(--border-default);
  background: var(--bg-elevated);
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  font-family: 'Inter', sans-serif;
  transition: all 0.15s;
}
.lc-chip:hover { border-color: var(--border-strong); color: var(--text-primary); }
.lc-chip.on {
  border-color: var(--accent-blue);
  background: rgba(79,142,247,0.08);
  color: var(--accent-blue);
}

.lc-hours-row { display: flex; gap: 8px; flex-wrap: wrap; }
.lc-hour-btn {
  padding: 7px 14px;
  border-radius: 8px;
  border: 1px solid var(--border-default);
  background: var(--bg-elevated);
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  font-family: 'Inter', sans-serif;
  transition: all 0.15s;
}
.lc-hour-btn:hover { border-color: var(--border-strong); }
.lc-hour-btn.active {
  border-color: var(--accent-blue);
  background: rgba(79,142,247,0.08);
  color: var(--accent-blue);
}

.lc-toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 14px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-default);
  border-radius: 10px;
}
.lc-toggle {
  width: 44px; height: 26px;
  border-radius: 13px;
  border: none;
  cursor: pointer;
  position: relative;
  transition: background 0.2s;
  flex-shrink: 0;
}
.lc-toggle.on { background: var(--accent-blue); }
.lc-toggle.off { background: var(--border-strong); }
.lc-toggle-knob {
  width: 20px; height: 20px;
  border-radius: 50%;
  background: white;
  position: absolute;
  top: 3px;
  transition: left 0.2s;
}
.lc-toggle.on .lc-toggle-knob { left: 21px; }
.lc-toggle.off .lc-toggle-knob { left: 3px; }

/* Integrations */
.integration-body { display: flex; flex-direction: column; gap: 12px; }
.integration-desc { font-size: 13px; color: var(--text-secondary); line-height: 1.6; }

.test-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  font-family: 'Inter', sans-serif;
  white-space: nowrap;
  transition: all 0.15s;
  flex-shrink: 0;
  height: 40px;
}
.test-btn:hover:not(:disabled) { border-color: var(--accent-blue); color: var(--accent-blue); }
.test-btn:disabled { opacity: 0.4; cursor: not-allowed; }

.test-result { font-size: 13px; padding: 10px 14px; border-radius: var(--radius-md); line-height: 1.5; }
.test-result.success { background: rgba(34,197,94,0.08); border: 1px solid rgba(34,197,94,0.2); color: #22c55e; }
.test-result.error { background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2); color: #ef4444; }

.settings-error {
  background: rgba(239,68,68,0.08);
  border: 1px solid rgba(239,68,68,0.2);
  color: #ef4444;
  padding: 12px 16px;
  border-radius: var(--radius-md);
  font-size: 13px;
  margin-top: 16px;
}
.settings-actions { display: flex; justify-content: flex-end; padding: 20px 0 40px; }

.save-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 32px;
  background: var(--accent-blue); color: #fff;
  color: white;
  border: none;
  border-radius: var(--radius-full);
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  font-family: 'Inter', sans-serif;
  transition: opacity 0.2s, transform 0.15s, box-shadow 0.2s;
  min-width: 160px;
  justify-content: center;
}
.save-btn:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); box-shadow: 0 8px 24px rgba(79,142,247,0.35); }
.save-btn:disabled { opacity: 0.6; cursor: not-allowed; }

.mini-spinner {
  width: 14px; height: 14px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  display: inline-block;
}
.mini-spinner.white { border-top-color: white; }
@keyframes spin { to { transform: rotate(360deg); } }
`;
