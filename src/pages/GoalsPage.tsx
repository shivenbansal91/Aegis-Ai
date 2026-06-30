import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { getUserGoals } from '../lib/db';
import type { Goal } from '../types';

function getRiskColor(risk: number): string {
  if (risk <= 30) return '#22c55e';
  if (risk <= 60) return '#f59e0b';
  return '#ef4444';
}

function getPriorityBadge(priority: string) {
  const map: Record<string, { label: string; color: string }> = {
    critical: { label: 'Critical', color: '#ef4444' },
    high: { label: 'High', color: '#f97316' },
    medium: { label: 'Medium', color: '#f59e0b' },
    low: { label: 'Low', color: '#22c55e' },
  };
  return map[priority] ?? map.medium;
}

function daysUntil(dateStr: string): number {
  const d = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export default function GoalsPage() {
  const { user } = useAuth();
  const [goals, setGoals] = React.useState<Goal[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!user) return;
    getUserGoals(user.id)
      .then(g => { setGoals(g); setLoading(false); })
      .catch(() => { setError('Failed to load goals.'); setLoading(false); });
  }, [user]);

  return (
    <div className="goals-root">
      <div className="goals-header">
        <div>
          <h1 className="goals-title">My Goals</h1>
          <p className="goals-subtitle">
            {loading ? '' : goals.length === 0
              ? 'No active goals yet — create one to get started.'
              : `${goals.length} active goal${goals.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <Link to="/goals/new" className="btn-new-goal">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          New Goal
        </Link>
      </div>

      {error && (
        <div className="goals-error">{error}</div>
      )}

      {loading ? (
        <div className="goals-loading">
          {[1, 2, 3].map(i => (
            <div key={i} className="goal-skeleton" />
          ))}
        </div>
      ) : goals.length === 0 ? (
        <EmptyGoals />
      ) : (
        <div className="goals-grid">
          {goals.map((goal, i) => (
            <GoalCard key={goal.id} goal={goal} index={i} />
          ))}
        </div>
      )}

      <style>{GOALS_STYLES}</style>
    </div>
  );
}

function GoalCard({ goal, index }: { goal: Goal; index: number }) {
  const allTasks = goal.tasks ?? [];
  const completedCount = allTasks.filter(t => t.status === 'completed').length;
  const totalCount = allTasks.length;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const days = daysUntil(goal.deadline);
  const riskColor = getRiskColor(goal.risk_score);
  const priorityBadge = getPriorityBadge(goal.priority);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.5 }}
      whileHover={{ y: -3, transition: { duration: 0.15 } }}
    >
      <Link to={`/goals/${goal.id}`} className="goal-card glass" style={{ textDecoration: 'none', display: 'block' }}>
        {/* Card Header */}
        <div className="gc-header">
          <div className="gc-badges">
            <span
              className="gc-badge"
              style={{ background: `${priorityBadge.color}18`, color: priorityBadge.color }}
            >
              {priorityBadge.label}
            </span>
            <span
              className="gc-badge"
              style={{ background: `${riskColor}18`, color: riskColor }}
            >
              {goal.risk_score <= 30 ? 'Low Risk' : goal.risk_score <= 60 ? 'Medium Risk' : 'High Risk'}
            </span>
          </div>
          <div className="gc-days" style={{ color: days <= 3 ? '#ef4444' : days <= 7 ? '#f59e0b' : 'var(--text-muted)' }}>
            {days > 0 ? `${days}d left` : days === 0 ? 'Today!' : `${Math.abs(days)}d over`}
          </div>
        </div>

        {/* Title */}
        <h3 className="gc-title">{goal.title}</h3>
        {goal.description && <p className="gc-desc">{goal.description}</p>}

        {/* Progress */}
        <div className="gc-progress-section">
          <div className="gc-progress-header">
            <span className="gc-progress-label">{completedCount}/{totalCount} tasks</span>
            <span className="gc-progress-pct" style={{ color: '#4f8ef7' }}>{progressPct}%</span>
          </div>
          <div className="gc-progress-bar">
            <div
              className="gc-progress-fill"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Footer Stats */}
        <div className="gc-footer">
          <div className="gc-stat">
            <span className="gc-stat-val" style={{ color: '#22c55e' }}>{goal.completion_probability}%</span>
            <span className="gc-stat-label">Completion</span>
          </div>
          <div className="gc-stat">
            <span className="gc-stat-val">{goal.health_score}</span>
            <span className="gc-stat-label">Health</span>
          </div>
          <div className="gc-stat">
            <span className="gc-stat-val">{goal.milestones?.length ?? 0}</span>
            <span className="gc-stat-label">Milestones</span>
          </div>
          <div className="gc-stat">
            <span className="gc-stat-val">
              {new Date(goal.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
            <span className="gc-stat-label">Deadline</span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

function EmptyGoals() {
  return (
    <motion.div
      className="goals-empty"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="goals-empty-icon">🎯</div>
      <h2 className="goals-empty-title">Create your first goal</h2>
      <p className="goals-empty-desc">
        Give the AI a goal title, deadline, and how many hours you have each day.
        It'll generate a full execution plan with milestones and tasks.
      </p>
      <Link to="/goals/new" className="btn-new-goal-large">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
        </svg>
        Generate AI Plan
      </Link>
    </motion.div>
  );
}

const GOALS_STYLES = `
.goals-root {
  padding: 32px;
  max-width: 1100px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 28px;
  min-height: 100vh;
}
.goals-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}
.goals-title { font-size: 28px; font-weight: 800; letter-spacing: -1px; margin-bottom: 4px; }
.goals-subtitle { font-size: 14px; color: var(--text-muted); }

.btn-new-goal {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: var(--text-primary);
  color: var(--bg-base);
  font-size: 14px;
  font-weight: 600;
  padding: 10px 20px;
  border-radius: var(--radius-full);
  text-decoration: none;
  white-space: nowrap;
  transition: opacity 0.2s, transform 0.15s, box-shadow 0.2s;
}
.btn-new-goal:hover {
  opacity: 0.9;
  transform: translateY(-1px);
  box-shadow: 0 8px 24px rgba(79,142,247,0.35);
}

.goals-error {
  background: rgba(239,68,68,0.08);
  border: 1px solid rgba(239,68,68,0.2);
  color: #ef4444;
  padding: 12px 16px;
  border-radius: var(--radius-md);
  font-size: 13px;
}

.goals-loading { display: flex; flex-direction: column; gap: 14px; }
.goal-skeleton {
  height: 180px;
  background: var(--bg-surface);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-subtle);
  animation: shimmer 1.5s linear infinite;
  background-size: 200% 100%;
  background-image: linear-gradient(90deg, var(--bg-surface) 0%, var(--bg-elevated) 50%, var(--bg-surface) 100%);
}

.goals-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}
@media (max-width: 700px) { .goals-grid { grid-template-columns: 1fr; } }

.goal-card {
  padding: 22px;
  border-radius: var(--radius-xl);
  display: flex;
  flex-direction: column;
  gap: 14px;
  cursor: pointer;
  transition: box-shadow 0.2s, transform 0.15s;
  color: var(--text-primary);
}
.goal-card:hover { box-shadow: var(--shadow-glow); }

.gc-header { display: flex; justify-content: space-between; align-items: center; }
.gc-badges { display: flex; gap: 6px; }
.gc-badge {
  font-size: 10px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: var(--radius-full);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.gc-days { font-size: 12px; font-weight: 700; }

.gc-title { font-size: 17px; font-weight: 700; letter-spacing: -0.4px; }
.gc-desc { font-size: 13px; color: var(--text-muted); line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

.gc-progress-section { display: flex; flex-direction: column; gap: 6px; }
.gc-progress-header { display: flex; justify-content: space-between; align-items: center; }
.gc-progress-label { font-size: 12px; color: var(--text-muted); }
.gc-progress-pct { font-size: 13px; font-weight: 700; }
.gc-progress-bar { height: 5px; background: var(--bg-overlay); border-radius: 3px; overflow: hidden; }
.gc-progress-fill { height: 100%; background: var(--accent-blue); border-radius: 3px; transition: width 0.6s ease; }

.gc-footer {
  display: flex;
  justify-content: space-between;
  padding-top: 8px;
  border-top: 1px solid var(--border-subtle);
}
.gc-stat { display: flex; flex-direction: column; align-items: center; gap: 2px; }
.gc-stat-val { font-size: 14px; font-weight: 700; }
.gc-stat-label { font-size: 10px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; }

.goals-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 80px 24px;
  gap: 16px;
}
.goals-empty-icon { font-size: 56px; }
.goals-empty-title { font-size: 24px; font-weight: 800; letter-spacing: -0.8px; }
.goals-empty-desc { font-size: 15px; color: var(--text-secondary); max-width: 420px; line-height: 1.65; }
.btn-new-goal-large {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  background: var(--text-primary);
  color: var(--bg-base);
  font-size: 15px;
  font-weight: 700;
  padding: 14px 28px;
  border-radius: var(--radius-full);
  text-decoration: none;
  margin-top: 8px;
  transition: opacity 0.2s, transform 0.15s, box-shadow 0.2s;
}
.btn-new-goal-large:hover {
  opacity: 0.9;
  transform: translateY(-1px);
  box-shadow: 0 8px 30px rgba(79,142,247,0.4);
}
`;
