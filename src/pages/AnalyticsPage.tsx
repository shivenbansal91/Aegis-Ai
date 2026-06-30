import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { getUserGoals } from '../lib/db';
import { supabase } from '../lib/supabase';
import type { Goal, DailyCheckin } from '../types';

// ── Tiny bar chart (no external lib) ──────────────────────────

function MiniBarChart({ data, color = '#4f8ef7' }: { data: number[]; color?: string }) {
  const max = Math.max(...data, 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '56px', width: '100%' }}>
      {data.map((v, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            height: `${Math.max((v / max) * 100, 4)}%`,
            background: color,
            borderRadius: '3px 3px 0 0',
            opacity: i === data.length - 1 ? 1 : 0.4 + (i / data.length) * 0.5,
            transition: 'height 0.4s ease',
          }}
        />
      ))}
    </div>
  );
}

// ── Donut ring (SVG) ──────────────────────────────────────────

function DonutRing({ pct, color, size = 80 }: { pct: number; color: string; size?: number }) {
  const r = size / 2 - 8;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="7" />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none"
        stroke={color}
        strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circ}`}
        strokeDashoffset={circ * 0.25}
        style={{ transition: 'stroke-dasharray 0.6s ease' }}
      />
    </svg>
  );
}

// ── Helpers ───────────────────────────────────────────────────

function getLast7Days(): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split('T')[0];
  });
}

function dayLabel(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short' });
}

// ── Main Page ─────────────────────────────────────────────────

export default function AnalyticsPage() {
  const { user } = useAuth();
  const [goals, setGoals] = React.useState<Goal[]>([]);
  const [checkins, setCheckins] = React.useState<DailyCheckin[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!user) { setLoading(false); return; }
    Promise.all([
      getUserGoals(user.id),
      supabase
        .from('daily_checkins')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: true })
        .then(r => r.data ?? []),
    ]).then(([g, c]) => {
      setGoals(g);
      setCheckins(c as DailyCheckin[]);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [user]);

  // ── Derived metrics ──

  const last7 = getLast7Days();

  // Tasks completed per day (last 7)
  const tasksPerDay = last7.map(date => {
    const ci = checkins.find(c => c.date === date);
    return ci ? (ci.completed_task_ids?.length ?? 0) : 0;
  });

  // Check-in streak (consecutive days going back from today)
  let streak = 0;
  for (let i = last7.length - 1; i >= 0; i--) {
    if (checkins.some(c => c.date === last7[i])) streak++;
    else break;
  }

  // Total tasks completed across all check-ins
  const totalTasksDone = checkins.reduce((acc, c) => acc + (c.completed_task_ids?.length ?? 0), 0);
  const totalTasksBlocked = checkins.reduce((acc, c) => acc + (c.blocked_task_ids?.length ?? 0), 0);

  // Overall completion rate from all goals
  const allTasks = goals.flatMap(g => g.tasks ?? []);
  const completedTasks = allTasks.filter(t => t.status === 'completed').length;
  const completionRate = allTasks.length > 0 ? Math.round((completedTasks / allTasks.length) * 100) : 0;

  // Average health score
  const avgHealth = goals.length
    ? Math.round(goals.reduce((a, g) => a + g.health_score, 0) / goals.length)
    : 0;

  // Risk trend (last 7 days risk from check-ins)
  const riskTrend = last7.map(date => {
    const ci = checkins.find(c => c.date === date);
    return ci?.risk_after ?? null;
  });
  const riskWithDefaults = riskTrend.map((v, i) =>
    v !== null ? v : (i === 0 ? 50 : riskTrend.slice(0, i).filter(x => x !== null).at(-1) ?? 50)
  ) as number[];

  const noData = goals.length === 0 && checkins.length === 0;

  return (
    <div className="analytics-root">
      {/* Header */}
      <div className="analytics-header">
        <div>
          <h1 className="analytics-title">Insights</h1>
          <p className="analytics-subtitle">Your productivity data and AI recommendations.</p>
        </div>
        {goals.length === 0 && !loading && (
          <Link to="/goals/new" className="btn-create-goal-sm">
            + Create a Goal
          </Link>
        )}
      </div>

      {loading ? (
        <div className="analytics-loading">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="analytics-skeleton" />)}
        </div>
      ) : noData ? (
        <EmptyAnalytics />
      ) : (
        <>
          {/* Top KPI row */}
          <div className="kpi-row">
            {[
              { label: 'Active Goals', value: goals.length, icon: '🎯', color: '#4f8ef7' },
              { label: 'Tasks Completed', value: totalTasksDone, icon: '✅', color: '#22c55e' },
              { label: 'Completion Rate', value: `${completionRate}%`, icon: '📈', color: '#7c3aed' },
              { label: 'Check-in Streak', value: `${streak}d`, icon: '🔥', color: '#f97316' },
              { label: 'Tasks Blocked', value: totalTasksBlocked, icon: '⛔', color: '#ef4444' },
              { label: 'Avg Health', value: avgHealth, icon: '💚', color: '#22c55e' },
            ].map((kpi, i) => (
              <motion.div
                key={kpi.label}
                className="kpi-card glass"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
              >
                <div className="kpi-icon" style={{ color: kpi.color }}>{kpi.icon}</div>
                <div className="kpi-value" style={{ color: kpi.color }}>{kpi.value}</div>
                <div className="kpi-label">{kpi.label}</div>
              </motion.div>
            ))}
          </div>

          {/* Chart row */}
          <div className="charts-row">
            {/* Daily task completion */}
            <motion.div className="chart-card glass"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <div className="chart-title">Tasks Completed — Last 7 Days</div>
              <MiniBarChart data={tasksPerDay} color="#4f8ef7" />
              <div className="chart-labels">
                {last7.map(d => <span key={d}>{dayLabel(d)}</span>)}
              </div>
            </motion.div>

            {/* Risk trend */}
            <motion.div className="chart-card glass"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.27 }}>
              <div className="chart-title">Risk Score Trend — Last 7 Days</div>
              <MiniBarChart data={riskWithDefaults} color="#ef4444" />
              <div className="chart-labels">
                {last7.map(d => <span key={d}>{dayLabel(d)}</span>)}
              </div>
            </motion.div>
          </div>

          {/* Goals health table */}
          <motion.div className="goals-health-card glass"
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.34 }}>
            <div className="chart-title" style={{ marginBottom: '16px' }}>Goal Health Overview</div>
            <div className="goals-health-table">
              <div className="ght-header">
                <span>Goal</span>
                <span>Progress</span>
                <span>Health</span>
                <span>Risk</span>
                <span>Probability</span>
                <span>Deadline</span>
              </div>
              {goals.map(g => {
                const allT = g.tasks ?? [];
                const done = allT.filter(t => t.status === 'completed').length;
                const pct = allT.length > 0 ? Math.round((done / allT.length) * 100) : 0;
                const days = Math.ceil((new Date(g.deadline).getTime() - Date.now()) / 86400000);
                const riskColor = g.risk_score <= 30 ? '#22c55e' : g.risk_score <= 60 ? '#f59e0b' : '#ef4444';
                const healthColor = g.health_score >= 80 ? '#22c55e' : g.health_score >= 60 ? '#4f8ef7' : g.health_score >= 40 ? '#f59e0b' : '#ef4444';
                return (
                  <Link key={g.id} to={`/goals/${g.id}`} className="ght-row">
                    <span className="ght-goal-name">{g.title}</span>
                    <span className="ght-progress">
                      <div className="ght-bar-wrap">
                        <div className="ght-bar" style={{ width: `${pct}%` }} />
                      </div>
                      <span style={{ fontSize: '12px', color: '#4f8ef7', fontWeight: 700, minWidth: '32px' }}>{pct}%</span>
                    </span>
                    <span style={{ color: healthColor, fontWeight: 700, fontSize: '13px' }}>{g.health_score}</span>
                    <span style={{ color: riskColor, fontWeight: 700, fontSize: '13px' }}>{g.risk_score}</span>
                    <span style={{ color: '#22c55e', fontWeight: 700, fontSize: '13px' }}>{g.completion_probability}%</span>
                    <span style={{ color: days <= 3 ? '#ef4444' : 'var(--text-muted)', fontSize: '12px', fontWeight: 600 }}>
                      {days > 0 ? `${days}d` : 'Overdue'}
                    </span>
                  </Link>
                );
              })}
            </div>
          </motion.div>

          {/* Check-in history */}
          {checkins.length > 0 && (
            <motion.div className="checkin-history-card glass"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.41 }}>
              <div className="chart-title" style={{ marginBottom: '16px' }}>Recent Daily Reviews</div>
              <div className="ci-history-list">
                {[...checkins].reverse().slice(0, 7).map((ci, i) => (
                  <div key={i} className="ci-history-row">
                    <div className="ci-hist-date">
                      {new Date(ci.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </div>
                    <div className="ci-hist-stats">
                      <span style={{ color: '#22c55e' }}>✓ {ci.completed_task_ids?.length ?? 0}</span>
                      <span style={{ color: '#f59e0b' }}>~ {ci.partial_task_ids?.length ?? 0}</span>
                      <span style={{ color: '#ef4444' }}>✗ {ci.blocked_task_ids?.length ?? 0}</span>
                    </div>
                    {ci.risk_before !== undefined && ci.risk_after !== undefined && (
                      <div className="ci-hist-risk">
                        Risk {ci.risk_before} → {' '}
                        <span style={{ color: ci.risk_after > ci.risk_before ? '#ef4444' : '#22c55e', fontWeight: 700 }}>
                          {ci.risk_after}
                        </span>
                      </div>
                    )}
                    {ci.ai_feedback && (
                      <div className="ci-hist-feedback">{ci.ai_feedback}</div>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </>
      )}

      <style>{ANALYTICS_STYLES}</style>
    </div>
  );
}

function EmptyAnalytics() {
  return (
    <motion.div className="analytics-empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="analytics-empty-icon">📊</div>
      <h2 className="analytics-empty-title">No data yet</h2>
      <p className="analytics-empty-desc">
        Create a goal, complete some tasks, and do your first Daily Review.
        Your insights will appear here automatically.
      </p>
      <Link to="/goals/new" className="btn-create-goal-sm">
        Create First Goal →
      </Link>
    </motion.div>
  );
}

const ANALYTICS_STYLES = `
.analytics-root {
  padding: 32px;
  max-width: 1100px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-height: 100vh;
}
.analytics-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}
.analytics-title { font-size: 28px; font-weight: 800; letter-spacing: -1px; margin-bottom: 4px; }
.analytics-subtitle { font-size: 14px; color: var(--text-muted); }
.btn-create-goal-sm {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--text-primary);
  color: var(--bg-base);
  font-size: 13px;
  font-weight: 600;
  padding: 9px 18px;
  border-radius: var(--radius-full);
  text-decoration: none;
  white-space: nowrap;
  transition: opacity 0.2s, transform 0.15s;
}
.btn-create-goal-sm:hover { opacity: 0.9; transform: translateY(-1px); }
.analytics-loading {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
}
.analytics-skeleton {
  height: 100px;
  background: var(--bg-surface);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-subtle);
  animation: shimmer 1.5s linear infinite;
  background-size: 200% 100%;
  background-image: linear-gradient(90deg, var(--bg-surface) 0%, var(--bg-elevated) 50%, var(--bg-surface) 100%);
}
.analytics-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 80px 24px;
  gap: 16px;
}
.analytics-empty-icon { font-size: 56px; }
.analytics-empty-title { font-size: 24px; font-weight: 800; letter-spacing: -0.8px; }
.analytics-empty-desc { font-size: 15px; color: var(--text-secondary); max-width: 420px; line-height: 1.65; }

/* KPI row */
.kpi-row {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 12px;
}
@media (max-width: 900px) { .kpi-row { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 500px) { .kpi-row { grid-template-columns: repeat(2, 1fr); } }
.kpi-card {
  border-radius: var(--radius-lg);
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  text-align: center;
  align-items: center;
}
.kpi-icon { font-size: 22px; }
.kpi-value { font-size: 24px; font-weight: 800; letter-spacing: -0.8px; line-height: 1; }
.kpi-label { font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.6px; }

/* Chart row */
.charts-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
@media (max-width: 700px) { .charts-row { grid-template-columns: 1fr; } }
.chart-card {
  border-radius: var(--radius-lg);
  padding: 22px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.chart-title { font-size: 13px; font-weight: 700; color: var(--text-secondary); letter-spacing: -0.2px; }
.chart-labels {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.4px;
}

/* Goals health table */
.goals-health-card { border-radius: var(--radius-lg); padding: 24px; }
.goals-health-table { display: flex; flex-direction: column; gap: 0; }
.ght-header {
  display: grid;
  grid-template-columns: 2fr 1.5fr 0.7fr 0.7fr 1fr 0.7fr;
  gap: 12px;
  padding: 8px 12px;
  font-size: 11px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.7px;
  font-weight: 600;
}
.ght-row {
  display: grid;
  grid-template-columns: 2fr 1.5fr 0.7fr 0.7fr 1fr 0.7fr;
  gap: 12px;
  padding: 12px;
  border-radius: var(--radius-md);
  text-decoration: none;
  color: var(--text-primary);
  align-items: center;
  transition: background 0.15s;
}
.ght-row:hover { background: rgba(255,255,255,0.03); }
.ght-goal-name { font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ght-progress { display: flex; align-items: center; gap: 8px; }
.ght-bar-wrap { flex: 1; height: 4px; background: var(--bg-overlay); border-radius: 2px; overflow: hidden; }
.ght-bar { height: 100%; background: var(--accent-blue); border-radius: 2px; }

/* Donuts */
.donuts-card { border-radius: var(--radius-lg); padding: 24px; }
.donuts-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 28px;
}
.donut-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  text-decoration: none;
  color: var(--text-primary);
  transition: opacity 0.15s;
}
.donut-item:hover { opacity: 0.8; }
.donut-label { font-size: 12px; font-weight: 600; max-width: 90px; text-align: center; color: var(--text-secondary); line-height: 1.3; }

/* Check-in history */
.checkin-history-card { border-radius: var(--radius-lg); padding: 24px; margin-bottom: 32px; }
.ci-history-list { display: flex; flex-direction: column; gap: 0; }
.ci-history-row {
  padding: 14px 0;
  border-bottom: 1px solid var(--border-subtle);
  display: flex;
  align-items: flex-start;
  gap: 20px;
  flex-wrap: wrap;
}
.ci-history-row:last-child { border-bottom: none; }
.ci-hist-date { font-size: 12px; font-weight: 700; color: var(--text-muted); min-width: 110px; padding-top: 1px; }
.ci-hist-stats { display: flex; gap: 12px; font-size: 13px; font-weight: 600; }
.ci-hist-risk { font-size: 12px; color: var(--text-muted); }
.ci-hist-feedback { font-size: 13px; color: var(--text-secondary); flex: 1; line-height: 1.5; min-width: 200px; }
`;
