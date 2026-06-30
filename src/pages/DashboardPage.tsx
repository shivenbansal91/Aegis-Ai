import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { getUserGoals, getTodaysTasks } from '../lib/db';
import FocusCard from '../components/FocusCard';
import type { Goal, Task } from '../types';

function daysUntil(dateStr: string): number {
  const d = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function getRiskColor(risk: number): string {
  if (risk <= 30) return '#22c55e';
  if (risk <= 60) return '#f59e0b';
  return '#ef4444';
}

function getHealthLabel(score: number): string {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Warning';
  return 'Critical';
}

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

function formatDate(d: Date) {
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

export default function DashboardPage() {
  const { profile, user } = useAuth();
  const firstName = profile?.display_name?.split(' ')[0] ?? 'there';

  const [goals, setGoals] = React.useState<Goal[]>([]);
  const [todaysTasks, setTodaysTasks] = React.useState<Task[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!user) { setLoading(false); return; }
    Promise.all([
      getUserGoals(user.id),
      getTodaysTasks(user.id),
    ]).then(([g, t]) => {
      setGoals(g);
      setTodaysTasks(t);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [user]);

  // Aggregate stats
  const avgHealth = goals.length
    ? Math.round(goals.reduce((a, g) => a + g.health_score, 0) / goals.length)
    : 0;
  const highRiskGoals = goals.filter(g => g.risk_score > 60);
  const todayTaskCount = todaysTasks.length;

  // Today's best action = highest priority pending task
  const bestAction = todaysTasks[0] ?? null;

  // Upcoming deadlines (next 7 days)
  const upcoming = goals
    .filter(g => daysUntil(g.deadline) <= 7 && daysUntil(g.deadline) >= 0)
    .sort((a, b) => daysUntil(a.deadline) - daysUntil(b.deadline));

  const stats = [
    { label: 'Active Goals', value: goals.length.toString(), icon: '🎯', color: '#4f8ef7', bg: 'rgba(79,142,247,0.1)' },
    { label: 'Avg Health', value: goals.length ? getHealthLabel(avgHealth) : '—', icon: '💚', color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
    { label: 'Tasks Today', value: todayTaskCount.toString(), icon: '✅', color: '#7c3aed', bg: 'rgba(124,58,237,0.1)' },
    { label: 'At Risk', value: highRiskGoals.length.toString(), icon: '⚠️', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  ];

  return (
    <div className="dashboard-root">
      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-greeting">
            Good {getTimeOfDay()}, {firstName} 👋
          </h1>
          <p className="dashboard-date">{formatDate(new Date())}</p>
        </div>
        <Link to="/goals/new" className="btn-create-goal">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          New Goal
        </Link>
      </div>

      {/* Today's Focus — AI Chief of Staff briefing */}
      {!loading && goals.length > 0 && <FocusCard />}

      {/* Stats row */}
      <div className="dashboard-stats">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            className="stat-card glass"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07, duration: 0.5 }}
          >
            <div className="stat-icon" style={{ background: stat.bg, color: stat.color }}>{stat.icon}</div>
            <div className="stat-value" style={{ color: stat.color, fontSize: typeof stat.value === 'string' && stat.value.length > 4 ? '18px' : undefined }}>
              {stat.value}
            </div>
            <div className="stat-label">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Main grid */}
      <div className="dashboard-grid">
        {/* Today's Mission */}
        <motion.div className="mission-card glass"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <div className="card-label">
            <span className="label-dot accent" />
            Today's Mission
          </div>
          {loading ? (
            <div className="card-skeleton" />
          ) : bestAction ? (
            <div className="mission-content">
              <div className="mission-task-title">{bestAction.title}</div>
              {bestAction.description && (
                <div className="mission-task-desc">{bestAction.description}</div>
              )}
              <div className="mission-meta">
                <span className={`task-priority priority-${bestAction.priority}`}>{bestAction.priority}</span>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{bestAction.estimated_hours}h</span>
              </div>
              <Link to={`/checkin`} className="mission-cta">
                Start Daily Review →
              </Link>
            </div>
          ) : (
            <div className="mission-empty">
              <div className="mission-empty-icon">🎯</div>
              <div className="mission-empty-title">{goals.length === 0 ? 'No active goals yet.' : 'All caught up!'}</div>
              <div className="mission-empty-desc">
                {goals.length === 0
                  ? 'Start your first goal and Aegis will help you stay on track from day one.'
                  : 'No pending tasks due today. Enjoy your day!'}
              </div>
              {goals.length === 0 && (
                <Link to="/goals/new" className="btn-primary-sm" style={{ marginTop: 12 }}>Create First Goal</Link>
              )}
            </div>
          )}
        </motion.div>

        {/* Active Goals */}
        <motion.div className="goals-card glass"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <div className="card-header">
            <div className="card-label">
              <span className="label-dot blue" />
              Active Goals
            </div>
            <Link to="/goals" className="card-link">View all →</Link>
          </div>
          {loading ? (
            <div className="card-skeleton" />
          ) : goals.length === 0 ? (
            <div className="goals-empty">
              <div className="goals-empty-icon">📋</div>
              <div className="goals-empty-title">Your roadmap is empty</div>
              <div className="goals-empty-desc">Create a goal to let Aegis build your timeline.</div>
            </div>
          ) : (
            <div className="goals-preview-list">
              {goals.slice(0, 4).map(g => {
                const allTasks = g.tasks ?? [];
                const done = allTasks.filter(t => t.status === 'completed').length;
                const pct = allTasks.length > 0 ? Math.round((done / allTasks.length) * 100) : 0;
                const days = daysUntil(g.deadline);
                return (
                  <Link key={g.id} to={`/goals/${g.id}`} className="gp-item">
                    <div className="gp-left">
                      <div className="gp-name">{g.title}</div>
                      <div className="gp-bar-wrap">
                        <div className="gp-bar" style={{ width: `${pct}%`, background: getRiskColor(g.risk_score) }} />
                      </div>
                    </div>
                    <div className="gp-right">
                      <div className="gp-pct" style={{ color: '#4f8ef7' }}>{pct}%</div>
                      <div className="gp-days" style={{ color: days <= 3 ? '#ef4444' : 'var(--text-muted)' }}>
                        {days}d
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* Risk Alerts */}
        <motion.div className="alerts-card glass"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <div className="card-label">
            <span className="label-dot warning" />
            Risk Alerts
          </div>
          {loading ? (
            <div className="card-skeleton" />
          ) : highRiskGoals.length === 0 ? (
            <div className="alerts-empty">
              <div style={{ fontSize: '28px' }}>✅</div>
              <div style={{ fontSize: '14px', fontWeight: 600, marginTop: '8px' }}>All clear</div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>No deadline risks detected.</div>
            </div>
          ) : (
            <div className="alerts-list">
              {highRiskGoals.map(g => (
                <Link key={g.id} to={`/goals/${g.id}`} className="alert-item">
                  <div className="alert-icon">⚠️</div>
                  <div className="alert-content">
                    <div className="alert-title">{g.title}</div>
                    <div className="alert-meta">Risk score: {g.risk_score}/100 · {daysUntil(g.deadline)}d left</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </motion.div>

        {/* Upcoming Deadlines */}
        <motion.div className="deadlines-card glass"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <div className="card-label">
            <span className="label-dot red" />
            Upcoming Deadlines
          </div>
          {loading ? (
            <div className="card-skeleton" />
          ) : upcoming.length === 0 ? (
            <div className="deadlines-empty">
              <div style={{ fontSize: '28px' }}>🗓️</div>
              <div style={{ fontSize: '14px', fontWeight: 600, marginTop: '8px' }}>No deadlines this week</div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
                {goals.length > 0 ? 'All deadlines are more than 7 days away.' : 'Add goals to see their deadlines here.'}
              </div>
            </div>
          ) : (
            <div className="deadlines-list">
              {upcoming.map(g => {
                const days = daysUntil(g.deadline);
                return (
                  <Link key={g.id} to={`/goals/${g.id}`} className="deadline-item">
                    <div className="deadline-days" style={{ color: days <= 1 ? '#ef4444' : days <= 3 ? '#f59e0b' : '#4f8ef7' }}>
                      {days === 0 ? 'Today' : `${days}d`}
                    </div>
                    <div className="deadline-info">
                      <div className="deadline-title">{g.title}</div>
                      <div className="deadline-date">
                        {new Date(g.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                    <div className="deadline-risk" style={{ color: getRiskColor(g.risk_score) }}>
                      {g.risk_score}%
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>

      {/* Daily Review CTA (if there are goals) */}
      {goals.length > 0 && (
        <motion.div className="checkin-banner glass-strong"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <div className="banner-content">
            <div className="banner-emoji">📊</div>
            <div>
              <div className="banner-title">Time for your Daily Review?</div>
              <div className="banner-desc">Tell Aegis what you completed today. It'll reassess risks and replan where needed.</div>
            </div>
          </div>
          <Link to="/checkin" className="btn-primary-outline">
            Open Daily Review
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </Link>
        </motion.div>
      )}

      {/* Onboarding CTA (only if no goals) */}
      {!loading && goals.length === 0 && (
        <motion.div className="onboarding-banner glass-strong"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <div className="banner-content">
            <div className="banner-emoji">🚀</div>
            <div>
              <div className="banner-title">Let's set your first goal</div>
              <div className="banner-desc">The AI will break it into tasks, estimate effort, and create a daily schedule — all automatically.</div>
            </div>
          </div>
          <Link to="/goals/new" className="btn-primary-outline">
            Create Goal with AI
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </Link>
        </motion.div>
      )}

      <style>{DASHBOARD_STYLES}</style>
    </div>
  );
}

const DASHBOARD_STYLES = `
.dashboard-root {
  padding: 32px;
  max-width: 1100px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 24px;
  min-height: 100vh;
}
.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}
.dashboard-greeting {
  font-size: 28px;
  font-weight: 800;
  letter-spacing: -1px;
  margin-bottom: 4px;
}
.dashboard-date { font-size: 14px; color: var(--text-muted); }
.btn-create-goal {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: var(--accent-blue); color: #fff;
  color: white;
  font-size: 14px;
  font-weight: 600;
  padding: 10px 20px;
  border-radius: var(--radius-full);
  text-decoration: none;
  transition: opacity 0.2s, transform 0.15s, box-shadow 0.2s;
  white-space: nowrap;
}
.btn-create-goal:hover { opacity: 0.9; transform: translateY(-1px); box-shadow: 0 8px 24px rgba(79,142,247,0.35); }

.dashboard-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}
@media (max-width: 800px) { .dashboard-stats { grid-template-columns: repeat(2, 1fr); } }
.stat-card {
  padding: 20px;
  border-radius: var(--radius-lg);
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.stat-icon {
  width: 36px; height: 36px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
}
.stat-value { font-size: 28px; font-weight: 800; letter-spacing: -1px; line-height: 1; }
.stat-label { font-size: 13px; color: var(--text-muted); }

.dashboard-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
@media (max-width: 700px) { .dashboard-grid { grid-template-columns: 1fr; } }

.mission-card, .goals-card, .alerts-card, .deadlines-card {
  padding: 24px;
  border-radius: var(--radius-lg);
}
.card-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: var(--text-muted);
  margin-bottom: 16px;
}
.label-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
.label-dot.accent { background: var(--accent-blue); }
.label-dot.blue { background: #4f8ef7; }
.label-dot.warning { background: #f59e0b; }
.label-dot.red { background: #ef4444; }
.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.card-header .card-label { margin-bottom: 0; }
.card-link { font-size: 13px; color: var(--accent-blue); text-decoration: none; }
.card-link:hover { opacity: 0.8; }
.card-skeleton {
  height: 80px;
  background: var(--bg-elevated);
  border-radius: var(--radius-md);
  animation: shimmer 1.5s linear infinite;
  background-size: 200% 100%;
  background-image: linear-gradient(90deg, var(--bg-elevated) 0%, var(--bg-overlay) 50%, var(--bg-elevated) 100%);
}

/* Mission card */
.mission-content { display: flex; flex-direction: column; gap: 8px; }
.mission-task-title { font-size: 16px; font-weight: 700; letter-spacing: -0.3px; }
.mission-task-desc { font-size: 13px; color: var(--text-muted); line-height: 1.5; }
.mission-meta { display: flex; align-items: center; gap: 8px; }
.mission-cta {
  display: inline-block;
  color: var(--accent-blue);
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
  margin-top: 4px;
}
.mission-cta:hover { opacity: 0.8; }
.mission-empty, .goals-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 24px 0;
  gap: 8px;
}
.alerts-empty, .deadlines-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 24px 0;
}
.mission-empty-icon, .goals-empty-icon { font-size: 32px; }
.mission-empty-title, .goals-empty-title { font-size: 15px; font-weight: 600; }
.mission-empty-desc, .goals-empty-desc { font-size: 13px; color: var(--text-muted); max-width: 220px; line-height: 1.5; }
.btn-primary-sm {
  display: inline-flex;
  align-items: center;
  background: var(--accent-blue); color: #fff;
  color: white;
  font-size: 13px;
  font-weight: 600;
  padding: 8px 18px;
  border-radius: var(--radius-full);
  text-decoration: none;
  margin-top: 8px;
  transition: opacity 0.2s;
}
.btn-primary-sm:hover { opacity: 0.85; }

/* Goals preview */
.goals-preview-list { display: flex; flex-direction: column; gap: 10px; }
.gp-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  text-decoration: none;
  color: var(--text-primary);
  padding: 4px 0;
  border-bottom: 1px solid var(--border-subtle);
  transition: opacity 0.15s;
}
.gp-item:last-child { border-bottom: none; }
.gp-item:hover { opacity: 0.8; }
.gp-left { flex: 1; display: flex; flex-direction: column; gap: 5px; }
.gp-name { font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 180px; }
.gp-bar-wrap { height: 3px; background: var(--bg-overlay); border-radius: 2px; overflow: hidden; }
.gp-bar { height: 100%; border-radius: 2px; }
.gp-right { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; }
.gp-pct { font-size: 13px; font-weight: 700; }
.gp-days { font-size: 11px; font-weight: 600; }

/* Alerts */
.alerts-list { display: flex; flex-direction: column; gap: 8px; }
.alert-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 12px;
  background: rgba(245,158,11,0.06);
  border: 1px solid rgba(245,158,11,0.15);
  border-radius: var(--radius-md);
  text-decoration: none;
  color: var(--text-primary);
  transition: background 0.15s;
}
.alert-item:hover { background: rgba(245,158,11,0.10); }
.alert-icon { font-size: 16px; flex-shrink: 0; }
.alert-title { font-size: 13px; font-weight: 600; }
.alert-meta { font-size: 12px; color: #f59e0b; }

/* Deadlines */
.deadlines-list { display: flex; flex-direction: column; gap: 8px; }
.deadline-item {
  display: flex;
  align-items: center;
  gap: 14px;
  text-decoration: none;
  color: var(--text-primary);
  padding: 8px 0;
  border-bottom: 1px solid var(--border-subtle);
  transition: opacity 0.15s;
}
.deadline-item:last-child { border-bottom: none; }
.deadline-item:hover { opacity: 0.8; }
.deadline-days { font-size: 16px; font-weight: 800; width: 42px; text-align: center; flex-shrink: 0; }
.deadline-info { flex: 1; }
.deadline-title { font-size: 13px; font-weight: 600; }
.deadline-date { font-size: 11px; color: var(--text-muted); }
.deadline-risk { font-size: 12px; font-weight: 700; flex-shrink: 0; }

/* Banners */
.checkin-banner, .onboarding-banner {
  border-radius: var(--radius-xl);
  padding: 24px 28px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 24px;
  border: 1px solid rgba(79,142,247,0.15);
  background: rgba(79,142,247,0.04);
}
.banner-content { display: flex; align-items: center; gap: 20px; }
.banner-emoji { font-size: 32px; flex-shrink: 0; }
.banner-title { font-size: 16px; font-weight: 700; margin-bottom: 4px; }
.banner-desc { font-size: 13px; color: var(--text-secondary); line-height: 1.5; }
.btn-primary-outline {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: transparent;
  color: var(--accent-blue);
  font-size: 13px;
  font-weight: 600;
  padding: 10px 20px;
  border-radius: var(--radius-full);
  border: 1px solid rgba(79,142,247,0.4);
  text-decoration: none;
  white-space: nowrap;
  transition: background 0.2s, border-color 0.2s;
}
.btn-primary-outline:hover { background: rgba(79,142,247,0.08); border-color: rgba(79,142,247,0.6); }

/* Task priority badges */
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
`;
