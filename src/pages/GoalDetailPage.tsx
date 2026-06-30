import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getGoalById, updateTaskStatus, deleteGoal, createTask, createMilestone } from '../lib/db';
import type { Goal, Task, TaskStatus } from '../types';

function getRiskLabel(risk: number): { label: string; color: string } {
  if (risk <= 30) return { label: 'Low Risk', color: '#22c55e' };
  if (risk <= 60) return { label: 'Medium Risk', color: '#f59e0b' };
  return { label: 'High Risk', color: '#ef4444' };
}

function getHealthLabel(score: number): { label: string; color: string } {
  if (score >= 80) return { label: 'Excellent', color: '#22c55e' };
  if (score >= 60) return { label: 'Good', color: '#4f8ef7' };
  if (score >= 40) return { label: 'Warning', color: '#f59e0b' };
  return { label: 'Critical', color: '#ef4444' };
}

function daysUntil(dateStr: string): number {
  const d = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export default function GoalDetailPage() {
  const { goalId } = useParams<{ goalId: string }>();
  const navigate = useNavigate();
  const [goal, setGoal] = React.useState<Goal | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [updatingTask, setUpdatingTask] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!goalId) return;
    getGoalById(goalId)
      .then(g => {
        setGoal(g);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load goal.');
        setLoading(false);
      });
  }, [goalId]);

  async function handleTaskToggle(task: Task) {
    if (!goal) return;
    const newStatus: TaskStatus = task.status === 'completed' ? 'pending' : 'completed';
    setUpdatingTask(task.id);
    try {
      await updateTaskStatus(task.id, newStatus);
      // Optimistic update
      setGoal(g => {
        if (!g) return g;
        return {
          ...g,
          tasks: g.tasks?.map(t => t.id === task.id ? { ...t, status: newStatus } : t),
          milestones: g.milestones?.map(m => ({
            ...m,
            tasks: m.tasks?.map(t => t.id === task.id ? { ...t, status: newStatus } : t),
          })),
        };
      });
    } catch {
      // revert on error
    } finally {
      setUpdatingTask(null);
    }
  }

  async function handleDeleteGoal() {
    if (!goal || !window.confirm("Are you sure you want to delete this goal? This cannot be undone.")) return;
    try {
      await deleteGoal(goal.id);
      navigate('/dashboard');
    } catch (err) {
      alert("Failed to delete goal: " + (err instanceof Error ? err.message : String(err)));
    }
  }

  async function handleAddMilestone() {
    if (!goal) return;
    const title = window.prompt("Enter milestone title:");
    if (!title) return;
    try {
      const newMilestone = await createMilestone(goal.id, title, goal.deadline);
      setGoal(g => {
        if (!g) return g;
        return { ...g, milestones: [...(g.milestones || []), newMilestone] };
      });
    } catch (err) {
      alert("Failed to add milestone.");
    }
  }

  async function handleAddTask(milestoneId?: string) {
    if (!goal) return;
    const title = window.prompt("Enter task title:");
    if (!title) return;
    try {
      const newTask = await createTask({
        goal_id: goal.id,
        milestone_id: milestoneId,
        title,
        estimated_hours: 1,
        due_date: goal.deadline,
        priority: 'medium',
        source: goal.type
      });
      setGoal(g => {
        if (!g) return g;
        return { ...g, tasks: [...(g.tasks || []), newTask] };
      });
    } catch (err) {
      alert("Failed to add task.");
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ width: 32, height: 32, border: '2px solid rgba(79,142,247,0.2)', borderTopColor: '#4f8ef7', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error || !goal) {
    return (
      <div style={{ padding: '32px', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)' }}>{error ?? 'Goal not found.'}</p>
        <button onClick={() => navigate('/goals')} style={{ marginTop: '16px', color: 'var(--accent-blue)', background: 'none', border: 'none', cursor: 'pointer' }}>
          ← Back to Goals
        </button>
      </div>
    );
  }

  const allTasks = goal.tasks ?? [];
  const completedCount = allTasks.filter(t => t.status === 'completed').length;
  const totalCount = allTasks.length;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const days = daysUntil(goal.deadline);
  const riskInfo = getRiskLabel(goal.risk_score);
  const healthInfo = getHealthLabel(goal.health_score);

  // Group tasks by milestone
  const milestoneMap = new Map<string, Task[]>();
  (goal.milestones ?? []).forEach(m => milestoneMap.set(m.id, []));
  allTasks.forEach(t => {
    if (t.milestone_id && milestoneMap.has(t.milestone_id)) {
      milestoneMap.get(t.milestone_id)!.push(t);
    }
  });

  return (
    <div className="gd-root">
      {/* Header */}
      <div className="gd-header">
        <Link to="/goals" className="gd-back">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
          All Goals
        </Link>
        <div className="gd-header-row">
          <div>
            <h1 className="gd-title">{goal.title}</h1>
            {goal.description && <p className="gd-desc">{goal.description}</p>}
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button className="gd-btn-delete" onClick={handleDeleteGoal}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 6, display: 'inline-block', verticalAlign: 'middle' }}>
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
              Delete
            </button>
            <Link to="/checkin" className="btn-checkin">
              ✅ Daily Check-In
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="gd-stats">
        {/* Progress */}
        <motion.div
          className="gd-stat-card glass"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.0 }}
        >
          <div className="gd-stat-label">Progress</div>
          <div className="gd-stat-value" style={{ color: '#4f8ef7' }}>{progressPct}%</div>
          <div className="gd-progress-bar">
            <div className="gd-progress-fill" style={{ width: `${progressPct}%` }} />
          </div>
          <div className="gd-stat-sub">{completedCount}/{totalCount} tasks done</div>
        </motion.div>

        {/* Health */}
        <motion.div
          className="gd-stat-card glass"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.07 }}
        >
          <div className="gd-stat-label">Health Score</div>
          <div className="gd-stat-value" style={{ color: healthInfo.color }}>{goal.health_score}</div>
          <div className="gd-stat-badge" style={{ background: `${healthInfo.color}18`, color: healthInfo.color }}>
            {healthInfo.label}
          </div>
        </motion.div>

        {/* Completion Probability */}
        <motion.div
          className="gd-stat-card glass"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.14 }}
        >
          <div className="gd-stat-label">Completion Probability</div>
          <div className="gd-stat-value" style={{ color: '#22c55e' }}>{goal.completion_probability}%</div>
          <div className="gd-stat-sub">Based on current pace</div>
        </motion.div>

        {/* Risk */}
        <motion.div
          className="gd-stat-card glass"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.21 }}
        >
          <div className="gd-stat-label">Deadline Risk</div>
          <div className="gd-stat-value" style={{ color: riskInfo.color }}>{goal.risk_score}</div>
          <div className="gd-stat-badge" style={{ background: `${riskInfo.color}18`, color: riskInfo.color }}>
            {riskInfo.label}
          </div>
          <div className="gd-stat-sub">{days} days remaining</div>
        </motion.div>
      </div>

      {/* Milestones + Tasks */}
      <div className="gd-section">
        <div className="gd-section-header">
          <h2 className="gd-section-title">Milestones & Tasks</h2>
          <div className="gd-section-actions">
            {goal.type === 'manual' && (
              <>
                <button className="gd-btn-add" onClick={handleAddMilestone}>+ Add Milestone</button>
                <button className="gd-btn-add" onClick={() => handleAddTask()}>+ Add Task</button>
              </>
            )}
            <div className="gd-section-hint">Click tasks to mark complete</div>
          </div>
        </div>

        <div className="milestones-list">
          {/* Unassigned Tasks (No Milestone) */}
          {milestoneMap.get(undefined as any)?.length ? (
            <motion.div
              className="gd-milestone glass"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="gd-m-header" style={{ paddingBottom: '16px', borderBottom: '1px solid var(--border-default)' }}>
                <div className="gd-m-left">
                  <div className="gd-m-num">--</div>
                  <div>
                    <div className="gd-m-title">General Tasks</div>
                    <div className="gd-m-meta">Tasks without a specific milestone</div>
                  </div>
                </div>
              </div>
              <div className="gd-tasks">
                {milestoneMap.get(undefined as any)!.map((task) => (
                  <button
                    key={task.id}
                    className={`gd-task ${task.status === 'completed' ? 'completed' : ''} ${updatingTask === task.id ? 'updating' : ''}`}
                    onClick={() => handleTaskToggle(task)}
                    disabled={updatingTask === task.id}
                  >
                    <div className="gd-task-checkbox">
                      {task.status === 'completed' && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <path d="M20 6L9 17l-5-5"/>
                        </svg>
                      )}
                    </div>
                    <div className="gd-task-content">
                      <div className="gd-task-title">{task.title}</div>
                      {task.description && <div className="gd-task-desc">{task.description}</div>}
                    </div>
                    <div className="gd-task-right">
                      <div className="task-hours">{task.estimated_hours}h</div>
                      {task.due_date && <div className="task-date">{new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>}
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          ) : null}

          {(goal.milestones ?? []).map((milestone, mIdx) => {
            const mTasks = milestoneMap.get(milestone.id) ?? [];
            const mDone = mTasks.filter(t => t.status === 'completed').length;
            const mPct = mTasks.length > 0 ? Math.round((mDone / mTasks.length) * 100) : 0;
            const mDays = daysUntil(milestone.due_date ?? goal.deadline);

            return (
              <motion.div
                key={milestone.id}
                className="gd-milestone glass"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: mIdx * 0.08 }}
              >
                {/* Milestone Header */}
                <div className="gd-m-header">
                  <div className="gd-m-left">
                    <div className={`gd-m-num ${milestone.status === 'completed' ? 'done' : ''}`}>
                      {milestone.status === 'completed' ? '✓' : String(mIdx + 1).padStart(2, '0')}
                    </div>
                    <div>
                      <div className="gd-m-title">{milestone.title}</div>
                      <div className="gd-m-meta">
                        Due {new Date(milestone.due_date ?? goal.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        {mDays > 0 ? ` (${mDays}d away)` : mDays === 0 ? ' (today)' : ` (${Math.abs(mDays)}d overdue)`}
                        &nbsp;·&nbsp;{mDone}/{mTasks.length} tasks
                      </div>
                    </div>
                  </div>
                  <div className="gd-m-progress">
                    <div className="gd-m-pct">{mPct}%</div>
                    <div className="gd-mini-bar">
                      <div className="gd-mini-fill" style={{ width: `${mPct}%` }} />
                    </div>
                  </div>
                </div>

                {/* Tasks */}
                <div className="gd-tasks">
                  {mTasks.length === 0 && (
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', padding: '12px 0' }}>No tasks in this milestone.</div>
                  )}
                  {mTasks
                    .sort((a, b) => a.order_index - b.order_index)
                    .map(task => (
                      <button
                        key={task.id}
                        className={`gd-task ${task.status === 'completed' ? 'completed' : ''}`}
                        onClick={() => handleTaskToggle(task)}
                        disabled={updatingTask === task.id}
                      >
                        <div className={`task-checkbox ${task.status === 'completed' ? 'checked' : ''}`}>
                          {task.status === 'completed' && (
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                              <polyline points="20 6 9 17 4 12"/>
                            </svg>
                          )}
                        </div>
                        <div className="gd-task-content">
                          <div className="gd-task-title">{task.title}</div>
                          {task.description && (
                            <div className="gd-task-desc">{task.description}</div>
                          )}
                        </div>
                        <div className="gd-task-right">
                          <span className={`task-priority priority-${task.priority}`}>{task.priority}</span>
                          <span className="task-hours">{task.estimated_hours}h</span>
                          {task.due_date && (
                            <span className="task-date">
                              {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* AI Plan Summary (collapsible) */}
      {goal.ai_plan && (
        <div className="gd-section">
          <details className="ai-plan-details glass">
            <summary className="ai-plan-summary-toggle">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
              </svg>
              View AI-Generated Plan Summary
            </summary>
            <div className="ai-plan-body">
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{goal.ai_plan.summary}</p>
              {goal.ai_plan.risk_factors?.length > 0 && (
                <>
                  <div className="ai-plan-sub-label">⚠️ Risk Factors</div>
                  <ul className="ai-plan-list">
                    {goal.ai_plan.risk_factors.map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                </>
              )}
              {goal.ai_plan.success_tips?.length > 0 && (
                <>
                  <div className="ai-plan-sub-label">💡 Success Tips</div>
                  <ul className="ai-plan-list">
                    {goal.ai_plan.success_tips.map((t, i) => <li key={i}>{t}</li>)}
                  </ul>
                </>
              )}
            </div>
          </details>
        </div>
      )}

      <style>{GD_STYLES}</style>
    </div>
  );
}

const GD_STYLES = `
.gd-root {
  padding: 32px;
  max-width: 900px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 28px;
  min-height: 100vh;
}
.gd-header { display: flex; flex-direction: column; gap: 12px; }
.gd-back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--text-muted);
  font-size: 13px;
  text-decoration: none;
  transition: color 0.2s;
}
.gd-back:hover { color: var(--text-primary); }
.gd-header-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  flex-wrap: wrap;
}
.gd-title { font-size: 28px; font-weight: 800; letter-spacing: -1px; margin-bottom: 6px; }
.gd-desc { font-size: 14px; color: var(--text-secondary); }
.btn-checkin {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: var(--accent-blue); color: #fff;
  color: white;
  text-decoration: none;
  border-radius: var(--radius-full);
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  transition: opacity 0.2s, transform 0.15s;
}
.btn-checkin:hover { opacity: 0.9; transform: translateY(-1px); }

.gd-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
}
@media (max-width: 800px) { .gd-stats { grid-template-columns: repeat(2, 1fr); } }
.gd-stat-card {
  padding: 20px;
  border-radius: var(--radius-lg);
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.gd-stat-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.8px; font-weight: 600; color: var(--text-muted); }
.gd-stat-value { font-size: 32px; font-weight: 800; letter-spacing: -1px; line-height: 1; }
.gd-stat-sub { font-size: 12px; color: var(--text-muted); }
.gd-stat-badge {
  display: inline-block;
  font-size: 11px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: var(--radius-full);
  width: fit-content;
}
.gd-progress-bar {
  height: 4px;
  background: var(--bg-overlay);
  border-radius: 2px;
  overflow: hidden;
}
.gd-progress-fill {
  height: 100%;
  background: var(--accent-blue); color: #fff;
  border-radius: 2px;
  transition: width 0.6s ease;
}

.gd-section { display: flex; flex-direction: column; gap: 14px; }
.gd-section-header { display: flex; justify-content: space-between; align-items: center; }
.gd-section-title { font-size: 18px; font-weight: 700; letter-spacing: -0.5px; }
.gd-section-hint { font-size: 12px; color: var(--text-muted); }

.milestones-list { display: flex; flex-direction: column; gap: 12px; }
.gd-milestone { border-radius: var(--radius-lg); overflow: hidden; }
.gd-m-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px;
  gap: 16px;
  border-bottom: 1px solid var(--border-subtle);
}
.gd-m-left { display: flex; align-items: center; gap: 14px; }
.gd-m-num {
  width: 32px; height: 32px;
  font-size: 11px;
  font-weight: 800;
  color: var(--accent-blue);
  background: rgba(79,142,247,0.1);
  border: 1px solid rgba(79,142,247,0.2);
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.gd-m-num.done { color: #22c55e; background: rgba(34,197,94,0.1); border-color: rgba(34,197,94,0.2); }
.gd-m-title { font-size: 15px; font-weight: 700; }
.gd-m-meta { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
.gd-m-progress { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; flex-shrink: 0; }
.gd-m-pct { font-size: 14px; font-weight: 700; color: var(--accent-blue); }
.gd-mini-bar { width: 80px; height: 3px; background: var(--bg-overlay); border-radius: 2px; }
.gd-mini-fill { height: 100%; background: var(--accent-blue); border-radius: 2px; }

.gd-tasks { padding: 8px 20px 16px; display: flex; flex-direction: column; gap: 6px; }
.gd-task {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  width: 100%;
  padding: 12px;
  background: rgba(255,255,255,0.02);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  cursor: pointer;
  text-align: left;
  transition: background 0.15s, border-color 0.15s;
  font-family: 'Inter', sans-serif;
  color: var(--text-primary);
}
.gd-task:hover:not(:disabled) { background: rgba(255,255,255,0.04); border-color: var(--border-default); }
.gd-task.completed { opacity: 0.55; }
.gd-task:disabled { cursor: wait; }

.task-checkbox {
  width: 18px; height: 18px;
  border: 1.5px solid var(--border-strong);
  border-radius: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 1px;
  transition: background 0.15s, border-color 0.15s;
}
.task-checkbox.checked {
  background: #22c55e;
  border-color: #22c55e;
}
.gd-task-content { flex: 1; min-width: 0; }
.gd-task-title { font-size: 13px; font-weight: 600; }
.gd-task.completed .gd-task-title { text-decoration: line-through; color: var(--text-muted); }
.gd-task-desc { font-size: 12px; color: var(--text-muted); margin-top: 2px; line-height: 1.4; }
.gd-task-right { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; flex-shrink: 0; }
.task-hours { font-size: 11px; color: var(--text-muted); font-weight: 600; }
.task-date { font-size: 11px; color: var(--text-muted); }

.ai-plan-details { border-radius: var(--radius-lg); overflow: hidden; }
.ai-plan-summary-toggle {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 20px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-secondary);
  list-style: none;
  transition: color 0.2s;
}
.ai-plan-summary-toggle:hover { color: var(--text-primary); }
.ai-plan-summary-toggle::-webkit-details-marker { display: none; }
.ai-plan-body { padding: 0 20px 20px; display: flex; flex-direction: column; gap: 14px; }
.ai-plan-sub-label { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.7px; color: var(--text-muted); margin-top: 4px; }
.ai-plan-list { list-style: none; display: flex; flex-direction: column; gap: 6px; }
.ai-plan-list li { font-size: 13px; color: var(--text-secondary); padding-left: 14px; position: relative; line-height: 1.5; }
.ai-plan-list li::before { content: '→'; position: absolute; left: 0; color: var(--accent-blue); }

.gd-btn-delete {
  padding: 10px 16px;
  border-radius: var(--radius-full);
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  border: 1px solid rgba(239, 68, 68, 0.2);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  font-family: 'Inter', sans-serif;
  display: inline-flex;
  align-items: center;
}
.gd-btn-delete:hover {
  background: rgba(239, 68, 68, 0.2);
  border-color: rgba(239, 68, 68, 0.4);
}

.gd-section-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}
.gd-btn-add {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border-default);
  color: var(--text-primary);
  padding: 6px 12px;
  border-radius: var(--radius-sm);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}
.gd-btn-add:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: var(--border-strong);
}
.gd-btn-add-small {
  background: transparent;
  border: 1px dashed var(--border-strong);
  color: var(--text-muted);
  padding: 4px 8px;
  border-radius: var(--radius-sm);
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;
}
.gd-btn-add-small:hover {
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-primary);
  border-style: solid;
}
`;
