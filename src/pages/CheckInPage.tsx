import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { getUserGoals, updateTaskStatus, applyReplanUpdates } from '../lib/db';
import { analyzeCheckin, generateReplan } from '../lib/gemini';
import { supabase } from '../lib/supabase';
import { runVerifications, formatVerificationForPrompt } from '../lib/verify';
import type { Goal, Task } from '../types';


type CheckinStep = 'select-goal' | 'tasks' | 'analyzing' | 'results';

export default function CheckInPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedGoalId = searchParams.get('goalId');

  const [step, setStep] = React.useState<CheckinStep>(preselectedGoalId ? 'tasks' : 'select-goal');
  const [goals, setGoals] = React.useState<Goal[]>([]);
  const [selectedGoal, setSelectedGoal] = React.useState<Goal | null>(null);
  const [loadingGoals, setLoadingGoals] = React.useState(true);

  // Task states
  const [completedIds, setCompletedIds] = React.useState<Set<string>>(new Set());
  const [partialIds, setPartialIds] = React.useState<Set<string>>(new Set());
  const [blockedIds, setBlockedIds] = React.useState<Set<string>>(new Set());
  const [notes, setNotes] = React.useState('');

  // Results
  const [analysisResult, setAnalysisResult] = React.useState<{
    feedback: string;
    newRisk: number;
    recommendations: string[];
  } | null>(null);
  const [replanResult, setReplanResult] = React.useState<{ reason: string; changesSummary: string[]; impact: string } | null>(null);
  const [analyzing, setAnalyzing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [verifyStatus, setVerifyStatus] = React.useState('');

  // Load goals
  React.useEffect(() => {
    if (!user) return;
    getUserGoals(user.id).then(g => {
      setGoals(g);
      if (preselectedGoalId) {
        const found = g.find(x => x.id === preselectedGoalId);
        if (found) setSelectedGoal(found);
      }
      setLoadingGoals(false);
    });
  }, [user, preselectedGoalId]);

  // Today's tasks for selected goal
  const todaysTasks: Task[] = React.useMemo(() => {
    if (!selectedGoal?.tasks) return [];
    const today = new Date().toISOString().split('T')[0];
    return selectedGoal.tasks.filter(
      t => t.status !== 'completed' && (!t.due_date || t.due_date <= today)
    ).slice(0, 12);
  }, [selectedGoal]);

  function toggleTask(id: string, bucket: 'completed' | 'partial' | 'blocked') {
    const sets = { completed: completedIds, partial: partialIds, blocked: blockedIds };
    const setters = {
      completed: setCompletedIds,
      partial: setPartialIds,
      blocked: setBlockedIds,
    };
    // Remove from all buckets first
    ['completed', 'partial', 'blocked'].forEach(b => {
      setters[b as keyof typeof setters](prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    });
    // Toggle into target bucket
    if (!sets[bucket].has(id)) {
      setters[bucket](prev => new Set([...prev, id]));
    }
  }

  async function handleSubmitCheckin() {
    if (!selectedGoal || !user) return;
    setAnalyzing(true);
    setStep('analyzing');
    setError(null);

    try {
      // 1. Update task statuses in DB
      const updates: Promise<void>[] = [];
      completedIds.forEach(id => updates.push(updateTaskStatus(id, 'completed')));
      partialIds.forEach(id => updates.push(updateTaskStatus(id, 'in_progress')));
      blockedIds.forEach(id => updates.push(updateTaskStatus(id, 'missed')));
      await Promise.all(updates);

      // 2. Run GitHub + LeetCode verification (fetch profile for handles)
      let verificationContext = '';
      try {
        setVerifyStatus('🔍 Verifying GitHub & LeetCode activity…');
        const { data: profileData } = await supabase
          .from('profiles')
          .select('github_username, leetcode_handle')
          .eq('id', user.id)
          .single();

        if (profileData?.github_username || profileData?.leetcode_handle) {
          const verResult = await runVerifications({
            githubUsername: profileData.github_username ?? undefined,
            leetcodeHandle: profileData.leetcode_handle ?? undefined,
          });
          verificationContext = formatVerificationForPrompt(verResult);
          setVerifyStatus('✅ Verification complete — sending to Gemini…');
        } else {
          setVerifyStatus('⚡ Running Gemini analysis…');
        }
      } catch {
        setVerifyStatus('⚡ Running Gemini analysis…');
      }

      // 3. Get AI analysis with verification context
      const todayDate = new Date().toISOString().split('T')[0];
      const deadlineDate = new Date(selectedGoal.deadline);
      const daysRemaining = Math.ceil((deadlineDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

      const result = await analyzeCheckin({
        goalTitle: selectedGoal.title,
        completedTasks: todaysTasks.filter(t => completedIds.has(t.id)).map(t => t.title),
        partialTasks: todaysTasks.filter(t => partialIds.has(t.id)).map(t => t.title),
        blockedTasks: todaysTasks.filter(t => blockedIds.has(t.id)).map(t => t.title),
        plannedTasks: todaysTasks.map(t => t.title),
        notes,
        daysRemaining,
        currentRisk: selectedGoal.risk_score,
        verificationContext,
      });

      // 4. Save check-in to DB
      await supabase.from('daily_checkins').upsert({
        user_id: user.id,
        goal_id: selectedGoal.id,
        date: todayDate,
        completed_task_ids: [...completedIds],
        partial_task_ids: [...partialIds],
        blocked_task_ids: [...blockedIds],
        notes,
        ai_feedback: result.feedback,
        risk_before: selectedGoal.risk_score,
        risk_after: result.newRisk,
      });

      // 5. Update goal risk score
      await supabase
        .from('goals')
        .update({ risk_score: result.newRisk })
        .eq('id', selectedGoal.id);

      let finalReplanResult = null;

      // 6. Automatic Replanning if any tasks were delayed/missed (ONLY FOR AI GOALS)
      if (selectedGoal.type === 'ai' && (partialIds.size > 0 || blockedIds.size > 0)) {
        setVerifyStatus('🗓️ Adjusting your schedule...');
        const missedTasksData = todaysTasks
          .filter(t => partialIds.has(t.id) || blockedIds.has(t.id))
          .map(t => ({ id: t.id, title: t.title }));

        const remainingTasksData = (selectedGoal.tasks || [])
          .filter(t => t.status === 'pending' && !completedIds.has(t.id) && !partialIds.has(t.id) && !blockedIds.has(t.id))
          .map(t => ({ id: t.id, title: t.title }));

        try {
          const replanData = await generateReplan({
            goalTitle: selectedGoal.title,
            deadline: selectedGoal.deadline,
            daysRemaining,
            dailyHours: selectedGoal.daily_hours_available,
            missedTasks: missedTasksData,
            remainingTasks: remainingTasksData,
          });

          await applyReplanUpdates(selectedGoal.id, replanData.updatedTasks, replanData.newCompletionProbability);
          
          finalReplanResult = {
            reason: replanData.reason,
            changesSummary: replanData.changesSummary,
            impact: `Completion Probability: ${selectedGoal.completion_probability}% → ${replanData.newCompletionProbability}%\nGoal Health: ${result.newRisk > 50 ? 'At Risk' : 'Healthy'}`
          };
        } catch (e) {
          console.error("Replanning failed", e);
        }
      }

      setAnalysisResult(result);
      setReplanResult(finalReplanResult);
      setStep('results');
    } catch (err) {
      console.error('Check-in error:', err);
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setStep('tasks');
    } finally {
      setAnalyzing(false);
    }
  }

  const doneCount = completedIds.size + partialIds.size + blockedIds.size;
  const totalPlanned = todaysTasks.length;

  return (
    <div className="ci-root">
      <AnimatePresence mode="wait">

        {/* ── STEP 1: SELECT GOAL ── */}
        {step === 'select-goal' && (
          <motion.div key="select-goal" className="ci-container"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <div className="ci-header">
              <div className="ci-badge">Daily Check-In</div>
              <h1 className="ci-title">How did today go? ☀️</h1>
              <p className="ci-subtitle">Select a goal to review your progress.</p>
            </div>

            {loadingGoals ? (
              <div className="ci-loading">Loading goals…</div>
            ) : goals.length === 0 ? (
              <div className="ci-empty">
                <div style={{ fontSize: '40px' }}>🎯</div>
                <p>No active goals. <a href="/goals/new" style={{ color: 'var(--accent-blue)' }}>Create one first →</a></p>
              </div>
            ) : (
              <div className="ci-goal-list">
                {goals.map(g => {
                  const days = Math.ceil((new Date(g.deadline).getTime() - Date.now()) / 86400000);
                  return (
                    <button
                      key={g.id}
                      className="ci-goal-btn glass"
                      onClick={() => { setSelectedGoal(g); setStep('tasks'); }}
                    >
                      <div className="ci-gb-left">
                        <div className="ci-gb-title">{g.title}</div>
                        <div className="ci-gb-meta">{days}d remaining · Risk: {g.risk_score}/100</div>
                      </div>
                      <div className="ci-gb-right">
                        <div className="ci-gb-prob" style={{ color: g.risk_score <= 30 ? '#22c55e' : g.risk_score <= 60 ? '#f59e0b' : '#ef4444' }}>
                          {g.completion_probability}%
                        </div>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M9 18l6-6-6-6"/>
                        </svg>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* ── STEP 2: TASK STATUS ── */}
        {step === 'tasks' && selectedGoal && (
          <motion.div key="tasks" className="ci-container"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>

            <div className="ci-header">
              <button className="ci-back" onClick={() => setStep('select-goal')}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 18l-6-6 6-6"/>
                </svg>
                Change Goal
              </button>
              <div className="ci-badge">Checking in · {selectedGoal.title}</div>
              <h1 className="ci-title">Mark your progress</h1>
              <p className="ci-subtitle">Tell us what happened with today's tasks. Be honest — the AI uses this to replan.</p>
            </div>

            {error && <div className="ci-error">{error}</div>}

            {/* Progress indicator */}
            <div className="ci-progress-row">
              <div className="ci-prog-stat">
                <span className="ci-prog-val" style={{ color: '#22c55e' }}>{completedIds.size}</span>
                <span className="ci-prog-label">Done</span>
              </div>
              <div className="ci-prog-stat">
                <span className="ci-prog-val" style={{ color: '#f59e0b' }}>{partialIds.size}</span>
                <span className="ci-prog-label">Partial</span>
              </div>
              <div className="ci-prog-stat">
                <span className="ci-prog-val" style={{ color: '#ef4444' }}>{blockedIds.size}</span>
                <span className="ci-prog-label">Blocked</span>
              </div>
              <div className="ci-prog-stat">
                <span className="ci-prog-val" style={{ color: 'var(--text-muted)' }}>
                  {totalPlanned - doneCount}
                </span>
                <span className="ci-prog-label">Not marked</span>
              </div>
            </div>

            {/* Task list */}
            {todaysTasks.length === 0 ? (
              <div className="ci-no-tasks glass">
                <div style={{ fontSize: '32px' }}>🎉</div>
                <div style={{ fontWeight: 700, fontSize: '15px' }}>No pending tasks for today!</div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>All caught up. You can still leave a note below.</div>
              </div>
            ) : (
              <div className="ci-tasks-section">
                <div className="ci-tasks-label">Today's Tasks — tap to mark status</div>
                <div className="ci-tasks-list">
                  {todaysTasks.map(task => {
                    const isCompleted = completedIds.has(task.id);
                    const isPartial = partialIds.has(task.id);
                    const isBlocked = blockedIds.has(task.id);
                    return (
                      <div key={task.id} className="ci-task-row glass">
                        <div className="ci-task-info">
                          <div className="ci-task-title">{task.title}</div>
                          {task.description && <div className="ci-task-desc">{task.description}</div>}
                          <div className="ci-task-meta">{task.estimated_hours}h · {task.priority}</div>
                        </div>
                        <div className="ci-task-btns">
                          <button
                            className={`ci-status-btn done ${isCompleted ? 'active' : ''}`}
                            onClick={() => toggleTask(task.id, 'completed')}
                            title="Completed"
                          >✓ Done</button>
                          <button
                            className={`ci-status-btn partial ${isPartial ? 'active' : ''}`}
                            onClick={() => toggleTask(task.id, 'partial')}
                            title="Partially done"
                          >~ Partial</button>
                          <button
                            className={`ci-status-btn blocked ${isBlocked ? 'active' : ''}`}
                            onClick={() => toggleTask(task.id, 'blocked')}
                            title="Blocked"
                          >✗ Blocked</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="ci-notes-section glass">
              <label className="ci-notes-label">
                Additional notes
                <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}> — optional but helpful for AI analysis</span>
              </label>
              <textarea
                className="ci-notes-input"
                placeholder="Any blockers? What went well? What needs attention?"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            <button
              className="ci-submit-btn"
              onClick={handleSubmitCheckin}
              disabled={analyzing}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
              </svg>
              Submit Daily Review
            </button>
          </motion.div>
        )}

        {/* ── STEP 3: ANALYZING ── */}
        {step === 'analyzing' && (
          <motion.div key="analyzing" className="ci-analyzing"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="ci-analyzing-orb" />
            <div style={{ fontSize: '40px', animation: 'float 3s ease-in-out infinite', position: 'relative', zIndex: 1 }}>
              🧠
            </div>
            <h2 className="ci-analyzing-title">Your Chief of Staff is reviewing your progress</h2>
            <p className="ci-analyzing-sub" style={{ position: 'relative', zIndex: 1 }}>
              {verifyStatus || 'Verifying activity and generating recommendations…'}
            </p>
            <div className="generating-dots">
              <span /><span /><span />
            </div>
          </motion.div>
        )}

        {/* ── STEP 4: RESULTS ── */}
        {step === 'results' && analysisResult && selectedGoal && (
          <motion.div key="results" className="ci-container"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>

            <div className="ci-header">
              <div className="ci-badge" style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e', borderColor: 'rgba(34,197,94,0.2)' }}>
                ✓ Daily Review Complete
              </div>
              <h1 className="ci-title">Chief of Staff Assessment</h1>
            </div>

            {/* Risk delta */}
            <div className="ci-risk-card glass">
              <div className="ci-risk-row">
                <div className="ci-risk-item">
                  <div className="ci-risk-label">Risk Before</div>
                  <div className="ci-risk-val" style={{ color: selectedGoal.risk_score <= 30 ? '#22c55e' : selectedGoal.risk_score <= 60 ? '#f59e0b' : '#ef4444' }}>
                    {selectedGoal.risk_score}
                  </div>
                </div>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
                <div className="ci-risk-item">
                  <div className="ci-risk-label">Risk After</div>
                  <div className="ci-risk-val" style={{ color: analysisResult.newRisk <= 30 ? '#22c55e' : analysisResult.newRisk <= 60 ? '#f59e0b' : '#ef4444' }}>
                    {analysisResult.newRisk}
                  </div>
                </div>
                <div className="ci-risk-delta">
                  {analysisResult.newRisk > selectedGoal.risk_score
                    ? <span style={{ color: '#ef4444' }}>↑ +{analysisResult.newRisk - selectedGoal.risk_score}</span>
                    : analysisResult.newRisk < selectedGoal.risk_score
                    ? <span style={{ color: '#22c55e' }}>↓ {analysisResult.newRisk - selectedGoal.risk_score}</span>
                    : <span style={{ color: 'var(--text-muted)' }}>No change</span>}
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="ci-result-stats">
              <div className="ci-rs-card glass">
                <div className="ci-rs-val" style={{ color: '#22c55e' }}>{completedIds.size}</div>
                <div className="ci-rs-label">Completed</div>
              </div>
              <div className="ci-rs-card glass">
                <div className="ci-rs-val" style={{ color: '#f59e0b' }}>{partialIds.size}</div>
                <div className="ci-rs-label">Partial</div>
              </div>
              <div className="ci-rs-card glass">
                <div className="ci-rs-val" style={{ color: '#ef4444' }}>{blockedIds.size}</div>
                <div className="ci-rs-label">Blocked</div>
              </div>
            </div>

            {/* AI Feedback */}
            <div className="ci-feedback-card glass">
              <div className="ci-feedback-label">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-blue)" strokeWidth="2">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                </svg>
                Your Chief of Staff's Assessment
              </div>
              <p className="ci-feedback-text">{analysisResult.feedback}</p>
            </div>

            {/* Recommendations */}
            <div className="ci-recs-card glass">
              <div className="ci-feedback-label">🎯 Recommended Next Actions</div>
              <div className="ci-recs-list">
                {analysisResult.recommendations.map((r, i) => (
                  <div key={i} className="ci-rec-item">
                    <div className="ci-rec-num">{i + 1}</div>
                    <div className="ci-rec-text">{r}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Replan Results if applicable */}
            {replanResult && (
              <div className="ci-replan-card glass">
                <div className="ci-replan-header">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 20V10M18 20V4M6 20v-4"/>
                  </svg>
                  Your plan has been updated.
                </div>
                
                <div className="ci-replan-section">
                  <div className="ci-replan-label">Reason:</div>
                  <div className="ci-replan-text">{replanResult.reason}</div>
                </div>

                <div className="ci-replan-section">
                  <div className="ci-replan-label">Changes:</div>
                  <ul className="ci-replan-list">
                    {replanResult.changesSummary.map((change, i) => (
                      <li key={i}>• {change}</li>
                    ))}
                  </ul>
                </div>

                <div className="ci-replan-section">
                  <div className="ci-replan-label">Impact:</div>
                  <div className="ci-replan-text" style={{ whiteSpace: 'pre-line' }}>{replanResult.impact}</div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="ci-result-actions">
              <button className="ci-btn-secondary" onClick={() => navigate(`/goals/${selectedGoal.id}`)}>
                View Goal Detail
              </button>
              <button className="ci-btn-primary" onClick={() => navigate('/dashboard')}>
                Back to Dashboard
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{CI_STYLES}</style>
    </div>
  );
}

const CI_STYLES = `
.ci-root {
  min-height: 100vh;
  padding: 32px;
}
.ci-container {
  max-width: 680px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.ci-header { display: flex; flex-direction: column; gap: 8px; margin-bottom: 4px; }
.ci-badge {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  font-size: 11px;
  font-weight: 600;
  color: var(--accent-blue);
  background: rgba(79,142,247,0.08);
  border: 1px solid rgba(79,142,247,0.18);
  padding: 4px 12px;
  border-radius: var(--radius-full);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.ci-back {
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
.ci-back:hover { color: var(--text-primary); }
.ci-title { font-size: 28px; font-weight: 800; letter-spacing: -1px; }
.ci-subtitle { font-size: 14px; color: var(--text-muted); }
.ci-error {
  background: rgba(239,68,68,0.08);
  border: 1px solid rgba(239,68,68,0.2);
  color: #ef4444;
  padding: 12px 16px;
  border-radius: var(--radius-md);
  font-size: 13px;
}
.ci-loading { color: var(--text-muted); font-size: 14px; text-align: center; padding: 40px; }
.ci-empty { text-align: center; padding: 64px; color: var(--text-muted); display: flex; flex-direction: column; align-items: center; gap: 12px; }

/* Goal selection */
.ci-goal-list { display: flex; flex-direction: column; gap: 10px; }
.ci-goal-btn {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px;
  border-radius: var(--radius-lg);
  border: none;
  cursor: pointer;
  font-family: 'Inter', sans-serif;
  color: var(--text-primary);
  transition: background 0.15s, box-shadow 0.15s;
  text-align: left;
}
.ci-goal-btn:hover { box-shadow: var(--shadow-glow); }
.ci-gb-left { display: flex; flex-direction: column; gap: 4px; }
.ci-gb-title { font-size: 15px; font-weight: 700; }
.ci-gb-meta { font-size: 12px; color: var(--text-muted); }
.ci-gb-right { display: flex; align-items: center; gap: 10px; }
.ci-gb-prob { font-size: 18px; font-weight: 800; }

/* Progress row */
.ci-progress-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}
.ci-prog-stat {
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: 14px;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.ci-prog-val { font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
.ci-prog-label { font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; }

/* Task list */
.ci-tasks-section { display: flex; flex-direction: column; gap: 10px; }
.ci-tasks-label { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px; color: var(--text-muted); }
.ci-tasks-list { display: flex; flex-direction: column; gap: 8px; }
.ci-no-tasks {
  padding: 32px;
  border-radius: var(--radius-lg);
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.ci-task-row {
  border-radius: var(--radius-lg);
  padding: 14px 16px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  flex-wrap: wrap;
}
.ci-task-info { flex: 1; min-width: 0; }
.ci-task-title { font-size: 14px; font-weight: 600; margin-bottom: 2px; }
.ci-task-desc { font-size: 12px; color: var(--text-muted); margin-bottom: 4px; line-height: 1.4; }
.ci-task-meta { font-size: 11px; color: var(--text-muted); }
.ci-task-btns { display: flex; gap: 6px; flex-shrink: 0; flex-wrap: wrap; }

.ci-status-btn {
  padding: 5px 12px;
  border-radius: var(--radius-full);
  border: 1px solid var(--border-default);
  background: transparent;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  font-family: 'Inter', sans-serif;
  color: var(--text-muted);
  transition: all 0.15s;
  white-space: nowrap;
}
.ci-status-btn:hover { border-color: var(--border-strong); color: var(--text-primary); }
.ci-status-btn.done.active { background: rgba(34,197,94,0.12); border-color: rgba(34,197,94,0.4); color: #22c55e; }
.ci-status-btn.partial.active { background: rgba(245,158,11,0.12); border-color: rgba(245,158,11,0.4); color: #f59e0b; }
.ci-status-btn.blocked.active { background: rgba(239,68,68,0.12); border-color: rgba(239,68,68,0.4); color: #ef4444; }

/* Notes */
.ci-notes-section { padding: 20px; border-radius: var(--radius-lg); display: flex; flex-direction: column; gap: 10px; }
.ci-notes-label { font-size: 13px; font-weight: 600; color: var(--text-secondary); }
.ci-notes-input {
  background: var(--bg-elevated);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  padding: 12px 14px;
  color: var(--text-primary);
  font-size: 14px;
  font-family: 'Inter', sans-serif;
  outline: none;
  resize: vertical;
  transition: border-color 0.2s;
  width: 100%;
}
.ci-notes-input:focus { border-color: var(--accent-blue); }
.ci-notes-input::placeholder { color: var(--text-disabled); }

/* Submit */
.ci-submit-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  padding: 16px;
  background: var(--accent-blue); color: #fff;
  color: white;
  border: none;
  border-radius: var(--radius-lg);
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: opacity 0.2s, transform 0.15s, box-shadow 0.2s;
  font-family: 'Inter', sans-serif;
  margin-bottom: 32px;
}
.ci-submit-btn:hover:not(:disabled) {
  opacity: 0.9;
  transform: translateY(-1px);
  box-shadow: 0 8px 30px rgba(79,142,247,0.4);
}
.ci-submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* Analyzing screen */
.ci-analyzing {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
  text-align: center;
  position: relative;
}
.ci-analyzing-orb {
  position: absolute;
  width: 400px; height: 400px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255,255,255,0.03) 0%, transparent 70%);
  filter: blur(40px);
  animation: pulse-glow 3s ease-in-out infinite;
}
.ci-analyzing-title {
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.8px;
  position: relative;
  z-index: 1;
}
.ci-analyzing-sub {
  font-size: 14px;
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

/* Results */
.ci-risk-card { border-radius: var(--radius-lg); padding: 24px; }
.ci-risk-row { display: flex; align-items: center; justify-content: center; gap: 24px; flex-wrap: wrap; }
.ci-risk-item { text-align: center; }
.ci-risk-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.8px; color: var(--text-muted); margin-bottom: 4px; }
.ci-risk-val { font-size: 40px; font-weight: 800; letter-spacing: -1.5px; }
.ci-risk-delta { font-size: 18px; font-weight: 700; }

.ci-result-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.ci-rs-card { border-radius: var(--radius-lg); padding: 20px; text-align: center; }
.ci-rs-val { font-size: 32px; font-weight: 800; letter-spacing: -1px; }
.ci-rs-label { font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-top: 4px; }

.ci-feedback-card { border-radius: var(--radius-lg); padding: 22px; }
.ci-feedback-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: var(--text-muted);
  margin-bottom: 12px;
}
.ci-feedback-text { font-size: 15px; color: var(--text-primary); line-height: 1.7; }

.ci-recs-card { border-radius: var(--radius-lg); padding: 22px; }
.ci-recs-list { display: flex; flex-direction: column; gap: 10px; margin-top: 4px; }
.ci-rec-item { display: flex; align-items: flex-start; gap: 12px; }
.ci-rec-num {
  width: 24px; height: 24px;
  border-radius: 6px;
  background: rgba(79,142,247,0.1);
  border: 1px solid rgba(79,142,247,0.2);
  font-size: 11px;
  font-weight: 800;
  color: var(--accent-blue);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.ci-rec-text { font-size: 14px; color: var(--text-primary); line-height: 1.5; padding-top: 3px; }

.ci-result-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding-bottom: 32px;
}
.ci-btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 16px 24px;
  background: var(--text-primary);
  border: none;
  border-radius: var(--radius-full);
  color: var(--bg-base);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  font-family: 'Inter', sans-serif;
  transition: opacity 0.2s, transform 0.15s;
}
.ci-btn-primary:hover { opacity: 0.9; transform: translateY(-1px); }
.ci-btn-secondary {
  display: inline-flex;
  align-items: center;
  padding: 12px 20px;
  background: transparent;
  color: var(--text-secondary);
  border: 1px solid var(--border-default);
}
.ci-task-info { flex: 1; min-width: 0; }
.ci-task-title { font-size: 14px; font-weight: 600; margin-bottom: 2px; }
.ci-task-desc { font-size: 12px; color: var(--text-muted); margin-bottom: 4px; line-height: 1.4; }
.ci-task-meta { font-size: 11px; color: var(--text-muted); }
.ci-task-btns { display: flex; gap: 6px; flex-shrink: 0; flex-wrap: wrap; }

.ci-status-btn {
  padding: 5px 12px;
  border-radius: var(--radius-full);
  border: 1px solid var(--border-default);
  background: transparent;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  font-family: 'Inter', sans-serif;
  color: var(--text-muted);
  transition: all 0.15s;
  white-space: nowrap;
}
.ci-status-btn:hover { border-color: var(--border-strong); color: var(--text-primary); }
.ci-status-btn.done.active { background: rgba(34,197,94,0.12); border-color: rgba(34,197,94,0.4); color: #22c55e; }
.ci-status-btn.partial.active { background: rgba(245,158,11,0.12); border-color: rgba(245,158,11,0.4); color: #f59e0b; }
.ci-status-btn.blocked.active { background: rgba(239,68,68,0.12); border-color: rgba(239,68,68,0.4); color: #ef4444; }

/* Notes */
.ci-notes-section { padding: 20px; border-radius: var(--radius-lg); display: flex; flex-direction: column; gap: 10px; }
.ci-notes-label { font-size: 13px; font-weight: 600; color: var(--text-secondary); }
.ci-notes-input {
  background: var(--bg-elevated);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  padding: 12px 14px;
  color: var(--text-primary);
  font-size: 14px;
  font-family: 'Inter', sans-serif;
  outline: none;
  resize: vertical;
  transition: border-color 0.2s;
  width: 100%;
}
.ci-notes-input:focus { border-color: var(--accent-blue); }
.ci-notes-input::placeholder { color: var(--text-disabled); }

/* Submit */
.ci-submit-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  padding: 16px;
  background: var(--accent-blue); color: #fff;
  color: white;
  border: none;
  border-radius: var(--radius-lg);
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: opacity 0.2s, transform 0.15s, box-shadow 0.2s;
  font-family: 'Inter', sans-serif;
  margin-bottom: 32px;
}
.ci-submit-btn:hover:not(:disabled) {
  opacity: 0.9;
  transform: translateY(-1px);
  box-shadow: 0 8px 30px rgba(79,142,247,0.4);
}
.ci-submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* Analyzing screen */
.ci-analyzing {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
  text-align: center;
  position: relative;
}
.ci-analyzing-orb {
  position: absolute;
  width: 400px; height: 400px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255,255,255,0.03) 0%, transparent 70%);
  filter: blur(40px);
  animation: pulse-glow 3s ease-in-out infinite;
}
.ci-analyzing-title {
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.8px;
  position: relative;
  z-index: 1;
}
.ci-analyzing-sub {
  font-size: 14px;
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

/* Results */
.ci-risk-card { border-radius: var(--radius-lg); padding: 24px; }
.ci-risk-row { display: flex; align-items: center; justify-content: center; gap: 24px; flex-wrap: wrap; }
.ci-risk-item { text-align: center; }
.ci-risk-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.8px; color: var(--text-muted); margin-bottom: 4px; }
.ci-risk-val { font-size: 40px; font-weight: 800; letter-spacing: -1.5px; }
.ci-risk-delta { font-size: 18px; font-weight: 700; }

.ci-result-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.ci-rs-card { border-radius: var(--radius-lg); padding: 20px; text-align: center; }
.ci-rs-val { font-size: 32px; font-weight: 800; letter-spacing: -1px; }
.ci-rs-label { font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-top: 4px; }

.ci-feedback-card { border-radius: var(--radius-lg); padding: 22px; }
.ci-feedback-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: var(--text-muted);
  margin-bottom: 12px;
}
.ci-feedback-text { font-size: 15px; color: var(--text-primary); line-height: 1.7; }

.ci-recs-card { border-radius: var(--radius-lg); padding: 22px; }
.ci-recs-list { display: flex; flex-direction: column; gap: 10px; margin-top: 4px; }
.ci-rec-item { display: flex; align-items: flex-start; gap: 12px; }
.ci-rec-num {
  width: 24px; height: 24px;
  border-radius: 6px;
  background: rgba(79,142,247,0.1);
  border: 1px solid rgba(79,142,247,0.2);
  font-size: 11px;
  font-weight: 800;
  color: var(--accent-blue);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.ci-rec-text { font-size: 14px; color: var(--text-primary); line-height: 1.5; padding-top: 3px; }

.ci-result-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding-bottom: 32px;
}
.ci-btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 16px 24px;
  background: var(--text-primary);
  border: none;
  border-radius: var(--radius-full);
  color: var(--bg-base);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  font-family: 'Inter', sans-serif;
  transition: opacity 0.2s, transform 0.15s;
}
.ci-btn-primary:hover { opacity: 0.9; transform: translateY(-1px); }
.ci-btn-secondary {
  display: inline-flex;
  align-items: center;
  padding: 12px 20px;
  background: transparent;
  color: var(--text-secondary);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-full);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  font-family: 'Inter', sans-serif;
  transition: all 0.2s;
}
.ci-btn-secondary:hover { color: var(--text-primary); border-color: var(--border-strong); }

/* Replan Styles */
.ci-replan-card {
  margin-top: 24px;
  padding: 24px;
  border-radius: var(--radius-lg);
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--border-default);
  display: flex;
  flex-direction: column;
  gap: 16px;
  text-align: left;
}
.ci-replan-header {
  font-size: 16px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-primary);
  margin-bottom: 4px;
}
.ci-replan-section {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.ci-replan-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.ci-replan-text {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.5;
}
.ci-replan-list {
  list-style: none;
  padding: 0;
  margin: 0;
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.6;
}
`;
