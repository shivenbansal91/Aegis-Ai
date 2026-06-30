import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { generateGoalPlan } from '../lib/gemini';
import { createGoalWithPlan } from '../lib/db';
import type { GoalFormData, Priority, AIPlan } from '../types';

type Step = 'mode' | 'form' | 'generating' | 'preview';

type GoalMode = 'ai_roadmap' | 'manual' | 'habit';

const GOAL_MODES: {
  id: GoalMode;
  icon: string;
  title: string;
  subtitle: string;
  examples: string[];
}[] = [
  {
    id: 'ai_roadmap',
    icon: '⚡',
    title: 'AI Guided Goal',
    subtitle: 'Don\'t know where to start? Aegis creates milestones, tasks and a complete roadmap using AI.',
    examples: ['Learn Machine Learning', 'Build a Startup', 'Win a Hackathon', 'Become an AI Engineer'],
  },
  {
    id: 'manual',
    icon: '🗂️',
    title: 'Manual Goal',
    subtitle: 'Already know your plan? Create your own milestones and let Aegis track progress, health and risks.',
    examples: ['College Assignment', 'Portfolio Website', 'DBMS Project'],
  },
  {
    id: 'habit',
    icon: '🔁',
    title: 'Habit / Ongoing',
    subtitle: 'Track recurring activities with consistency instead of deadlines.',
    examples: ['LeetCode Daily', 'Reading', 'Gym', 'Journaling'],
  },
];

const PRIORITY_OPTIONS: { value: Priority; label: string; desc: string; color: string }[] = [
  { value: 'critical', label: '🔴 Critical', desc: 'Drop everything — this is #1', color: '#ef4444' },
  { value: 'high', label: '🟠 High', desc: 'Very important, focus heavily', color: '#f97316' },
  { value: 'medium', label: '🟡 Medium', desc: 'Important but balanced', color: '#f59e0b' },
  { value: 'low', label: '🟢 Low', desc: 'Nice to have, low urgency', color: '#22c55e' },
];

const QUICK_GOALS = [
  { title: 'Build Hackathon MVP', desc: 'Full-stack project with AI features', hours: 4 },
  { title: 'Complete DSA Practice', desc: 'LeetCode problems + concepts', hours: 2 },
  { title: 'Finish ML Course', desc: 'Video lectures + assignments', hours: 3 },
  { title: 'Prepare for Interview', desc: 'Resume, coding, system design', hours: 3 },
  { title: 'Launch Side Project', desc: 'Build & deploy a product', hours: 3 },
  { title: 'Get Certification', desc: 'Study & pass the exam', hours: 2 },
];

export default function NewGoalPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = React.useState<Step>('mode');
  const [selectedMode, setSelectedMode] = React.useState<GoalMode | null>(null);
  const [generatingMsg, setGeneratingMsg] = React.useState('');
  const [plan, setPlan] = React.useState<AIPlan | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  const [form, setForm] = React.useState<GoalFormData>({
    title: '',
    description: '',
    deadline: '',
    daily_hours_available: 2,
    priority: 'high',
  });

  const minDeadline = new Date();
  minDeadline.setDate(minDeadline.getDate() + 1);
  const minDateStr = minDeadline.toISOString().split('T')[0];

  function setField<K extends keyof GoalFormData>(key: K, val: GoalFormData[K]) {
    setForm(f => ({ ...f, [key]: val }));
  }

  function applyQuickGoal(qg: typeof QUICK_GOALS[0]) {
    setForm(f => ({ ...f, title: qg.title, description: qg.desc, daily_hours_available: qg.hours }));
  }

  const isFormValid = form.title.trim() && form.deadline;

  async function handleGenerate() {
    if (!isFormValid || !user) return;
    setError(null);
    setStep('generating');

    const msgs = [
      'Analysing your goal…',
      'Breaking into milestones…',
      'Estimating task effort…',
      'Building day-by-day schedule…',
      'Identifying risk factors…',
      'Finalising your plan…',
    ];

    let i = 0;
    setGeneratingMsg(msgs[0]);
    const interval = setInterval(() => {
      i = (i + 1) % msgs.length;
      setGeneratingMsg(msgs[i]);
    }, 1800);

    try {
      const aiPlan = await generateGoalPlan(form);
      clearInterval(interval);
      setPlan(aiPlan);
      setStep('preview');
    } catch (err) {
      clearInterval(interval);
      setError(err instanceof Error ? err.message : 'Failed to generate plan. Please try again.');
      setStep('form');
    }
  }

  async function handleSave() {
    if (!plan) return;
    if (!user) {
      setError('You must be signed in to save a goal.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const goalId = await createGoalWithPlan({
        userId: user.id,
        title: form.title,
        description: form.description,
        deadline: form.deadline,
        dailyHours: form.daily_hours_available,
        priority: form.priority,
        plan,
        type: 'ai'
      });
      navigate(`/goals/${goalId}`);
    } catch (err) {
      console.error('Save goal error:', err);
      setError(err instanceof Error ? err.message : 'Failed to save goal.');
      setSaving(false);
    }
  }

  async function handleSaveManualOrHabit() {
    if (!isFormValid || !user) return;
    setSaving(true);
    setError(null);
    try {
      const dummyPlan: AIPlan = {
        summary: selectedMode === 'habit' ? 'A recurring habit to track over time.' : 'A manually tracked goal.',
        total_estimated_hours: form.daily_hours_available * 7,
        milestones: [],
        schedule: [],
        risk_factors: [],
        success_tips: []
      };

      const goalId = await createGoalWithPlan({
        userId: user.id,
        title: form.title,
        description: form.description,
        deadline: form.deadline,
        dailyHours: form.daily_hours_available,
        priority: form.priority,
        plan: dummyPlan,
        type: selectedMode === 'habit' ? 'habit' : 'manual',
        habit_frequency: selectedMode === 'habit' ? 'daily' : undefined,
      });
      navigate(`/goals/${goalId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save goal.');
      setSaving(false);
    }
  }

  return (
    <div className="new-goal-root">
      <AnimatePresence mode="wait">

        {/* ── MODE SELECTION ── */}
        {step === 'mode' && (
          <motion.div
            key="mode"
            className="ng-container"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
          >
            <div className="ng-header">
              <button className="ng-back" onClick={() => navigate('/goals')}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 18l-6-6 6-6"/>
                </svg>
                Goals
              </button>
              <div>
                <h1 className="ng-title">How would you like Aegis to help?</h1>
                <p className="ng-subtitle">Choose whether you'd like Aegis to build a roadmap for you or simply help you execute a plan you already have.</p>
              </div>
            </div>

            <div className="mode-grid">
              {GOAL_MODES.map((mode, i) => (
                <motion.button
                  key={mode.id}
                  className={`mode-card ${selectedMode === mode.id ? 'mode-selected' : ''}`}
                  onClick={() => setSelectedMode(mode.id)}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07, duration: 0.35 }}
                >
                  <div className="mode-top">
                    <span className="mode-icon">{mode.icon}</span>
                  </div>
                  <div className="mode-title">{mode.title}</div>
                  <div className="mode-subtitle">{mode.subtitle}</div>
                  <div className="mode-examples">
                    {mode.examples.map(ex => (
                      <span key={ex} className="mode-ex-tag">• {ex}</span>
                    ))}
                  </div>
                </motion.button>
              ))}
            </div>

            <button
              className="btn-generate"
              disabled={!selectedMode}
              onClick={() => {
                setStep('form');
              }}
            >
              {selectedMode === 'ai_roadmap' ? 'Build My Roadmap' :
               selectedMode === 'manual' ? 'Create Manual Goal' :
               selectedMode === 'habit' ? 'Create Habit' : '...'}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginLeft: 6 }}>
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </button>
          </motion.div>
        )}

        {step === 'form' && (
          <motion.div
            key="form"
            className="ng-container"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
          >
            {/* Header */}
            <div className="ng-header">
              <button className="ng-back" onClick={() => setStep('mode')}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 18l-6-6 6-6"/>
                </svg>
                Back
              </button>
              <div>
                <h1 className="ng-title">Define your goal</h1>
                <p className="ng-subtitle">The more context you give, the sharper the plan Aegis produces.</p>
              </div>
            </div>

            {error && (
              <div className="ng-error">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
                </svg>
                {error}
              </div>
            )}

            {/* Quick picks */}
            <div className="ng-section">
              <div className="ng-section-label">Quick Start Templates</div>
              <div className="quick-goals-grid">
                {QUICK_GOALS.map(qg => (
                  <button
                    key={qg.title}
                    className={`quick-goal-btn ${form.title === qg.title ? 'selected' : ''}`}
                    onClick={() => applyQuickGoal(qg)}
                  >
                    <div className="qg-title">{qg.title}</div>
                    <div className="qg-desc">{qg.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Form */}
            <div className="ng-form glass">
              {/* Goal title */}
              <div className="form-group">
                <label className="form-label" htmlFor="goal-title">Goal Title *</label>
                <input
                  id="goal-title"
                  className="form-input"
                  type="text"
                  placeholder="e.g. Build a Hackathon MVP in 7 days"
                  value={form.title}
                  onChange={e => setField('title', e.target.value)}
                  maxLength={120}
                />
                <div className="form-hint">{form.title.length}/120</div>
              </div>

              {/* Description */}
              <div className="form-group">
                <label className="form-label" htmlFor="goal-desc">
                  Context
                  <span className="form-optional">optional — more detail = better plan</span>
                </label>
                <textarea
                  id="goal-desc"
                  className="form-input form-textarea"
                  placeholder="Technologies involved, what success looks like, constraints, etc."
                  value={form.description}
                  onChange={e => setField('description', e.target.value)}
                  rows={3}
                />
              </div>

              {/* Deadline + Hours row */}
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="goal-deadline">Deadline *</label>
                  <input
                    id="goal-deadline"
                    className="form-input"
                    type="date"
                    min={minDateStr}
                    value={form.deadline}
                    onChange={e => setField('deadline', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="goal-hours">
                    Hours per day
                    <span className="form-badge">{form.daily_hours_available}h</span>
                  </label>
                  <input
                    id="goal-hours"
                    className="form-range"
                    type="range"
                    min={0.5}
                    max={12}
                    step={0.5}
                    value={form.daily_hours_available}
                    onChange={e => setField('daily_hours_available', parseFloat(e.target.value))}
                  />
                  <div className="range-labels">
                    <span>30 min</span>
                    <span>12 hrs</span>
                  </div>
                </div>
              </div>

              {/* Priority */}
              <div className="form-group">
                <label className="form-label">Priority</label>
                <div className="priority-grid">
                  {PRIORITY_OPTIONS.map(p => (
                    <button
                      key={p.value}
                      className={`priority-btn ${form.priority === p.value ? 'selected' : ''}`}
                      style={form.priority === p.value ? { borderColor: p.color, background: `${p.color}14` } : {}}
                      onClick={() => setField('priority', p.value)}
                    >
                      <div className="priority-label">{p.label}</div>
                      <div className="priority-desc">{p.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Days calculation */}
              {form.deadline && (
                <div className="deadline-preview">
                  <DeadlinePreview form={form} />
                </div>
              )}

              {/* Submit */}
              <button
                id="generate-plan-btn"
                className="btn-generate"
                onClick={selectedMode === 'ai_roadmap' ? handleGenerate : handleSaveManualOrHabit}
                disabled={!isFormValid || saving}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                </svg>
                {selectedMode === 'ai_roadmap' ? 'Build My Roadmap' : 'Save Goal'}
              </button>
            </div>
          </motion.div>
        )}

        {step === 'generating' && (
          <motion.div
            key="generating"
            className="generating-screen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="generating-orb" />
            <div className="generating-icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill="currentColor" />
              </svg>
            </div>
            <h2 className="generating-title">Your Chief of Staff is building your roadmap</h2>
            <motion.p
              key={generatingMsg}
              className="generating-msg"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {generatingMsg}
            </motion.p>
            <div className="generating-dots">
              <span /><span /><span />
            </div>
          </motion.div>
        )}

        {step === 'preview' && plan && (
          <motion.div
            key="preview"
            className="ng-container"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
          >
            <PlanPreview
              form={form}
              plan={plan}
              saving={saving}
              error={error}
              onSave={handleSave}
              onRegenerate={() => { setPlan(null); handleGenerate(); }}
              onEdit={() => setStep('form')}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <style>{NEW_GOAL_STYLES}</style>
    </div>
  );
}

// ── Deadline Preview ──

function DeadlinePreview({ form }: { form: GoalFormData }) {
  const today = new Date();
  const deadline = new Date(form.deadline);
  const days = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const totalHours = days * form.daily_hours_available;

  return (
    <div className="deadline-stats">
      <div className="ds-item">
        <div className="ds-value">{days}</div>
        <div className="ds-label">days</div>
      </div>
      <div className="ds-sep">×</div>
      <div className="ds-item">
        <div className="ds-value">{form.daily_hours_available}</div>
        <div className="ds-label">hrs/day</div>
      </div>
      <div className="ds-sep">=</div>
      <div className="ds-item highlight">
        <div className="ds-value">{totalHours.toFixed(1)}</div>
        <div className="ds-label">total hrs</div>
      </div>
    </div>
  );
}

// ── Plan Preview ──

function PlanPreview({
  form, plan, saving, error, onSave, onRegenerate, onEdit
}: {
  form: GoalFormData;
  plan: AIPlan;
  saving: boolean;
  error: string | null;
  onSave: () => void;
  onRegenerate: () => void;
  onEdit: () => void;
}) {
  const [expandedMilestone, setExpandedMilestone] = React.useState<number | null>(0);

  return (
    <>
      {/* Header */}
      <div className="ng-header">
        <button className="ng-back" onClick={onEdit}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
          Edit Goal
        </button>
        <div>
          <h1 className="ng-title">Your AI-Generated Plan</h1>
          <p className="ng-subtitle">Review the plan — you can regenerate or adjust before saving.</p>
        </div>
      </div>

      {error && (
        <div className="ng-error">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
          {error}
        </div>
      )}

      {/* Plan Summary Card */}
      <div className="plan-summary glass">
        <div className="ps-header">
          <div>
            <div className="ps-goal-title">{form.title}</div>
            <div className="ps-goal-meta">
              Deadline: {new Date(form.deadline).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              &nbsp;·&nbsp;{form.daily_hours_available}h/day
              &nbsp;·&nbsp;<span style={{ textTransform: 'capitalize' }}>{form.priority} priority</span>
            </div>
          </div>
          <div className="ps-stats">
            <div className="ps-stat">
              <div className="ps-stat-val">{plan.milestones.length}</div>
              <div className="ps-stat-label">Milestones</div>
            </div>
            <div className="ps-stat">
              <div className="ps-stat-val">{plan.milestones.reduce((a, m) => a + m.tasks.length, 0)}</div>
              <div className="ps-stat-label">Tasks</div>
            </div>
            <div className="ps-stat">
              <div className="ps-stat-val">{plan.total_estimated_hours}h</div>
              <div className="ps-stat-label">Est. effort</div>
            </div>
          </div>
        </div>
        <p className="ps-summary">{plan.summary}</p>
      </div>

      {/* Milestones */}
      <div className="milestones-list">
        <div className="section-label">📍 Milestones & Tasks</div>
        {plan.milestones.map((m, mIdx) => (
          <div key={mIdx} className="milestone-card glass">
            <button
              className="milestone-header"
              onClick={() => setExpandedMilestone(expandedMilestone === mIdx ? null : mIdx)}
            >
              <div className="m-left">
                <div className="m-number">{String(mIdx + 1).padStart(2, '0')}</div>
                <div>
                  <div className="m-title">{m.title}</div>
                  <div className="m-meta">
                    Due {new Date(m.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    &nbsp;·&nbsp;{m.tasks.length} tasks
                  </div>
                </div>
              </div>
              <svg
                width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                style={{ transform: expandedMilestone === mIdx ? 'rotate(180deg)' : 'rotate(0deg)', transition: '0.2s' }}
              >
                <path d="M6 9l6 6 6-6"/>
              </svg>
            </button>

            <AnimatePresence>
              {expandedMilestone === mIdx && (
                <motion.div
                  className="milestone-tasks"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  style={{ overflow: 'hidden' }}
                >
                  <p className="m-desc">{m.description}</p>
                  {m.tasks.map((t, tIdx) => (
                    <div key={tIdx} className="task-row">
                      <div className="task-check-placeholder" />
                      <div className="task-content">
                        <div className="task-title">{t.title}</div>
                        <div className="task-desc">{t.description}</div>
                      </div>
                      <div className="task-meta">
                        <span className={`task-priority priority-${t.priority}`}>{t.priority}</span>
                        <span className="task-hours">{t.estimated_hours}h</span>
                        <span className="task-date">{new Date(t.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>

      {/* Risk Factors + Tips */}
      <div className="plan-insights-row">
        <div className="insights-card glass">
          <div className="section-label">⚠️ Risk Factors</div>
          <ul className="insights-list">
            {plan.risk_factors.map((r, i) => (
              <li key={i} className="insight-item risk">{r}</li>
            ))}
          </ul>
        </div>
        <div className="insights-card glass">
          <div className="section-label">💡 Success Tips</div>
          <ul className="insights-list">
            {plan.success_tips.map((t, i) => (
              <li key={i} className="insight-item tip">{t}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Actions */}
      <div className="plan-actions">
        <button className="btn-regenerate" onClick={onRegenerate} disabled={saving}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/>
          </svg>
          Regenerate Plan
        </button>
        <button
          id="save-goal-btn"
          className="btn-save"
          onClick={onSave}
          disabled={saving}
        >
          {saving ? (
            <>
              <div className="btn-spinner" />
              Saving…
            </>
          ) : (
            <>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Save Goal & Start Executing
            </>
          )}
        </button>
      </div>
    </>
  );
}

// ── Styles ──

const NEW_GOAL_STYLES = `
.new-goal-root {
  min-height: 100vh;
  padding: 32px;
}
.ng-container {
  max-width: 800px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 24px;
}
.ng-header {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.ng-back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: transparent;
  border: none;
  color: var(--text-muted);
  font-size: 13px;
  cursor: pointer;
  font-family: 'Inter', sans-serif;
  padding: 0;
  transition: color 0.2s;
}
.ng-back:hover { color: var(--text-primary); }
.ng-title {
  font-size: 28px;
  font-weight: 800;
  letter-spacing: -1px;
  margin-bottom: 4px;
}
.ng-subtitle {
  font-size: 14px;
  color: var(--text-muted);
}
.ng-error {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  background: rgba(239,68,68,0.08);
  border: 1px solid rgba(239,68,68,0.2);
  color: #ef4444;
  font-size: 13px;
  padding: 12px 16px;
  border-radius: var(--radius-md);
  line-height: 1.5;
}
.ng-section {}
.ng-section-label {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: var(--text-muted);
  margin-bottom: 12px;
}
.quick-goals-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}
@media (max-width: 600px) { .quick-goals-grid { grid-template-columns: repeat(2, 1fr); } }
.quick-goal-btn {
  background: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: 12px 14px;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
  font-family: 'Inter', sans-serif;
}
.quick-goal-btn:hover { border-color: var(--border-strong); background: var(--bg-overlay); }
.quick-goal-btn.selected {
  border-color: var(--accent-blue);
  background: rgba(79,142,247,0.06);
}
.qg-title { font-size: 13px; font-weight: 600; color: var(--text-primary); margin-bottom: 3px; }
.qg-desc { font-size: 11px; color: var(--text-muted); }

.ng-form {
  border-radius: var(--radius-xl);
  padding: 32px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}
.form-group { display: flex; flex-direction: column; gap: 8px; }
.form-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 8px;
}
.form-optional {
  font-size: 11px;
  font-weight: 400;
  color: var(--text-muted);
}
.form-badge {
  font-size: 11px;
  font-weight: 700;
  color: var(--accent-blue);
  background: rgba(79,142,247,0.1);
  padding: 2px 8px;
  border-radius: var(--radius-full);
}
.form-input {
  background: var(--bg-elevated);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  padding: 12px 14px;
  color: var(--text-primary);
  font-size: 14px;
  font-family: 'Inter', sans-serif;
  outline: none;
  transition: border-color 0.2s;
  width: 100%;
}
.form-input:focus { border-color: var(--accent-blue); }
.form-input::placeholder { color: var(--text-disabled); }
input[type="date"].form-input { color-scheme: dark; }
.form-textarea { resize: vertical; min-height: 80px; }
.form-hint { font-size: 11px; color: var(--text-muted); text-align: right; }

.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
@media (max-width: 600px) { .form-row { grid-template-columns: 1fr; } }

.form-range {
  width: 100%;
  accent-color: var(--accent-blue);
  cursor: pointer;
  height: 4px;
}
.range-labels {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 4px;
}

.priority-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}
@media (max-width: 600px) { .priority-grid { grid-template-columns: repeat(2, 1fr); } }
.priority-btn {
  background: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: 10px 12px;
  text-align: left;
  cursor: pointer;
  transition: all 0.15s;
  font-family: 'Inter', sans-serif;
}
.priority-btn:hover { border-color: var(--border-strong); }
.priority-label { font-size: 13px; font-weight: 600; color: var(--text-primary); margin-bottom: 2px; }
.priority-desc { font-size: 11px; color: var(--text-muted); }

.deadline-stats {
  display: flex;
  align-items: center;
  gap: 16px;
  background: rgba(79,142,247,0.05);
  border: 1px solid rgba(79,142,247,0.12);
  border-radius: var(--radius-md);
  padding: 14px 18px;
}
.ds-item { text-align: center; }
.ds-value { font-size: 22px; font-weight: 800; color: var(--text-primary); letter-spacing: -0.5px; }
.ds-label { font-size: 11px; color: var(--text-muted); }
.ds-item.highlight .ds-value { color: var(--accent-blue); }
.ds-sep { font-size: 18px; color: var(--text-muted); font-weight: 300; }

.btn-generate {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  padding: 16px;
  background: var(--text-primary);
  color: var(--bg-base);
  border: none;
  border-radius: var(--radius-lg);
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: opacity 0.2s, transform 0.15s, box-shadow 0.2s;
  font-family: 'Inter', sans-serif;
  letter-spacing: -0.2px;
}
.btn-generate:hover:not(:disabled) {
  opacity: 0.9;
  transform: translateY(-1px);
  box-shadow: 0 8px 30px rgba(79,142,247,0.4);
}
.btn-generate:disabled { opacity: 0.4; cursor: not-allowed; }

/* ─ GENERATING SCREEN ─ */
.generating-screen {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
  text-align: center;
  position: relative;
}
.generating-orb {
  position: absolute;
  width: 400px; height: 400px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255,255,255,0.03) 0%, transparent 70%);
  filter: blur(40px);
  animation: pulse-glow 3s ease-in-out infinite;
}
.generating-icon {
  animation: float 3s ease-in-out infinite;
  position: relative;
  z-index: 1;
  color: var(--text-primary);
}
.generating-title {
  font-size: 24px;
  font-weight: 800;
  letter-spacing: -0.8px;
  position: relative;
  z-index: 1;
}
.generating-msg {
  font-size: 15px;
  color: var(--text-secondary);
  position: relative;
  z-index: 1;
}
.generating-dots {
  display: flex;
  gap: 6px;
  position: relative;
  z-index: 1;
}
.generating-dots span {
  width: 6px; height: 6px;
  background: var(--accent-blue);
  border-radius: 50%;
  animation: bounce 1.2s ease-in-out infinite;
}
.generating-dots span:nth-child(2) { animation-delay: 0.2s; }
.generating-dots span:nth-child(3) { animation-delay: 0.4s; }
@keyframes bounce {
  0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
  30% { transform: translateY(-8px); opacity: 1; }
}

/* ─ PLAN PREVIEW ─ */
.plan-summary {
  border-radius: var(--radius-xl);
  padding: 28px;
}
.ps-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}
.ps-goal-title { font-size: 20px; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 4px; }
.ps-goal-meta { font-size: 13px; color: var(--text-muted); }
.ps-stats { display: flex; gap: 24px; flex-shrink: 0; }
.ps-stat { text-align: center; }
.ps-stat-val { font-size: 22px; font-weight: 800; color: var(--accent-blue); letter-spacing: -0.5px; }
.ps-stat-label { font-size: 11px; color: var(--text-muted); }
.ps-summary { font-size: 14px; color: var(--text-secondary); line-height: 1.6; }

.section-label {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: var(--text-muted);
  margin-bottom: 12px;
}
.milestones-list { display: flex; flex-direction: column; gap: 10px; }
.milestone-card {
  border-radius: var(--radius-lg);
  overflow: hidden;
}
.milestone-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 18px 20px;
  background: transparent;
  border: none;
  cursor: pointer;
  font-family: 'Inter', sans-serif;
  color: var(--text-primary);
  transition: background 0.15s;
}
.milestone-header:hover { background: rgba(255,255,255,0.02); }
.m-left { display: flex; align-items: center; gap: 14px; }
.m-number {
  font-size: 11px;
  font-weight: 800;
  color: var(--accent-blue);
  background: rgba(79,142,247,0.1);
  border: 1px solid rgba(79,142,247,0.2);
  width: 32px; height: 32px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  letter-spacing: 0.5px;
}
.m-title { font-size: 15px; font-weight: 700; text-align: left; }
.m-meta { font-size: 12px; color: var(--text-muted); text-align: left; margin-top: 2px; }

.milestone-tasks { padding: 0 20px 16px; }
.m-desc { font-size: 13px; color: var(--text-secondary); margin-bottom: 14px; line-height: 1.5; }
.task-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  border-radius: var(--radius-md);
  background: rgba(255,255,255,0.02);
  border: 1px solid var(--border-subtle);
  margin-bottom: 8px;
}
.task-check-placeholder {
  width: 16px; height: 16px;
  border: 1.5px solid var(--border-default);
  border-radius: 4px;
  flex-shrink: 0;
  margin-top: 2px;
}
.task-content { flex: 1; min-width: 0; }
.task-title { font-size: 13px; font-weight: 600; margin-bottom: 3px; }
.task-desc { font-size: 12px; color: var(--text-muted); line-height: 1.5; }
.task-meta { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; flex-shrink: 0; }
.task-priority {
  font-size: 10px;
  font-weight: 600;
  padding: 2px 7px;
  border-radius: var(--radius-full);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.priority-critical { background: rgba(239,68,68,0.12); color: #ef4444; }
.priority-high { background: rgba(249,115,22,0.12); color: #f97316; }
.priority-medium { background: rgba(245,158,11,0.12); color: #f59e0b; }
.priority-low { background: rgba(34,197,94,0.12); color: #22c55e; }
.task-hours { font-size: 12px; color: var(--text-muted); font-weight: 600; }
.task-date { font-size: 11px; color: var(--text-muted); }

.plan-insights-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
@media (max-width: 600px) { .plan-insights-row { grid-template-columns: 1fr; } }
.insights-card { border-radius: var(--radius-lg); padding: 20px; }
.insights-list { list-style: none; display: flex; flex-direction: column; gap: 8px; margin-top: 4px; }
.insight-item {
  font-size: 13px;
  color: var(--text-secondary);
  padding: 8px 12px;
  border-radius: var(--radius-md);
  line-height: 1.4;
  display: flex;
  align-items: flex-start;
  gap: 8px;
}
.insight-item.risk { background: rgba(245,158,11,0.06); border: 1px solid rgba(245,158,11,0.12); }
.insight-item.risk::before { content: '⚠'; flex-shrink: 0; }
.insight-item.tip { background: rgba(79,142,247,0.06); border: 1px solid rgba(79,142,247,0.12); }
.insight-item.tip::before { content: '→'; color: var(--accent-blue); flex-shrink: 0; }

.plan-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding-bottom: 32px;
}
.btn-regenerate {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 22px;
  background: transparent;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-full);
  color: var(--text-secondary);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  font-family: 'Inter', sans-serif;
}
.btn-regenerate:hover:not(:disabled) {
  border-color: var(--border-strong);
  color: var(--text-primary);
}
.btn-save {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 28px;
  background: var(--text-primary);
  border: none;
  border-radius: var(--radius-full);
  color: var(--bg-base);
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: opacity 0.2s, transform 0.15s, box-shadow 0.2s;
  font-family: 'Inter', sans-serif;
}
.btn-save:hover:not(:disabled) {
  opacity: 0.9;
  transform: translateY(-1px);
  box-shadow: 0 8px 24px rgba(79,142,247,0.35);
}
.btn-save:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-spinner {
  width: 14px; height: 14px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ─ MODE SELECTION ─ */
.mode-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
@media (max-width: 600px) { .mode-grid { grid-template-columns: 1fr; } }

.mode-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 20px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  text-align: left;
  cursor: pointer;
  font-family: 'Inter', sans-serif;
  transition: border-color 0.15s, background 0.15s, transform 0.15s;
  position: relative;
  overflow: hidden;
}
.mode-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(79,142,247,0.04) 0%, transparent 60%);
  opacity: 0;
  transition: opacity 0.2s;
}
.mode-card:hover:not(.mode-disabled) {
  border-color: var(--border-strong);
  transform: translateY(-1px);
}
.mode-card:hover:not(.mode-disabled)::before { opacity: 1; }
.mode-card.mode-selected {
  border-color: var(--accent-blue);
  background: rgba(79,142,247,0.06);
}
.mode-card.mode-disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.mode-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.mode-icon { font-size: 24px; }
.mode-tag {
  font-size: 10px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: var(--radius-full);
  letter-spacing: 0.3px;
}
.tag-blue {
  background: rgba(79,142,247,0.12);
  color: var(--accent-blue);
  border: 1px solid rgba(79,142,247,0.2);
}
.tag-dim {
  background: var(--bg-overlay);
  color: var(--text-disabled);
  border: 1px solid var(--border-subtle);
}
.mode-title {
  font-size: 16px;
  font-weight: 800;
  color: var(--text-primary);
  letter-spacing: -0.3px;
}
.mode-subtitle {
  font-size: 13px;
  color: var(--text-muted);
  line-height: 1.55;
}
.mode-examples {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 8px;
}
.mode-ex-tag {
  font-size: 11.5px;
  color: var(--text-secondary);
  font-weight: 500;
}
`;
