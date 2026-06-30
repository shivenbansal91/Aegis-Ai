import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { getUserGoals, getTodaysTasks } from '../lib/db';
import { supabase } from '../lib/supabase';
import { generateFocusBriefing } from '../lib/gemini';
import type { Goal, Task } from '../types';

// Cache focus briefing for 4 hours — don't regenerate on every visit
const CACHE_TTL_MS = 4 * 60 * 60 * 1000;

interface FocusCard {
  headline: string;       // One-line strategic direction
  reasoning: string;      // 1-2 sentence "why this, why now"
  taskId: string | null;  // Top task to focus on
  taskTitle: string;
  generatedAt: string;
}

export default function FocusCard() {
  const { user } = useAuth();
  const [card, setCard] = React.useState<FocusCard | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);

  React.useEffect(() => {
    if (!user) { setLoading(false); return; }
    loadFocus(false);
  }, [user]);

  async function loadFocus(forceRefresh: boolean) {
    if (!user) return;

    // Try loading cached card from Supabase profile
    if (!forceRefresh) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('focus_cache')
        .eq('id', user.id)
        .single();

      const cached = (profile as any)?.focus_cache as FocusCard | null;
      if (cached?.generatedAt) {
        const age = Date.now() - new Date(cached.generatedAt).getTime();
        if (age < CACHE_TTL_MS) {
          setCard(cached);
          setLoading(false);
          return;
        }
      }
    }

    // Generate fresh briefing
    setRefreshing(true);
    try {
      const [goals, tasks] = await Promise.all([
        getUserGoals(user.id),
        getTodaysTasks(user.id),
      ]);

      if (goals.length === 0) {
        setCard(null);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const briefing = await generateFocusBriefing(goals, tasks);
      const topTask = tasks[0] ?? null;

      const newCard: FocusCard = {
        headline: briefing.headline,
        reasoning: briefing.reasoning,
        taskId: topTask?.id ?? null,
        taskTitle: topTask?.title ?? '',
        generatedAt: new Date().toISOString(),
      };

      // Persist to cache
      await supabase
        .from('profiles')
        .update({ focus_cache: newCard } as any)
        .eq('id', user.id);

      setCard(newCard);
    } catch (e) {
      console.error('Focus briefing error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  if (loading) {
    return (
      <div className="focus-card glass focus-loading">
        <div className="focus-shimmer" />
      </div>
    );
  }

  if (!card) return null;

  const cachedAge = card.generatedAt
    ? Math.round((Date.now() - new Date(card.generatedAt).getTime()) / 60000)
    : null;

  return (
    <motion.div
      className="focus-card glass"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Header row */}
      <div className="focus-header">
        <div className="focus-label">
          <span className="focus-dot" />
          Today's Focus
        </div>
        <button
          className="focus-refresh"
          onClick={() => loadFocus(true)}
          disabled={refreshing}
          title="Refresh focus briefing"
        >
          <svg
            width="13" height="13" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5"
            style={{ animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }}
          >
            <path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/>
          </svg>
        </button>
      </div>

      {/* Main content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={card.generatedAt}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="focus-headline">{card.headline}</div>
          <div className="focus-reasoning">{card.reasoning}</div>

          {card.taskTitle && (
            <div className="focus-task">
              <div className="focus-task-label">Start with</div>
              <div className="focus-task-title">{card.taskTitle}</div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Footer */}
      {cachedAge !== null && (
        <div className="focus-footer">
          {cachedAge < 2 ? 'Just updated' : `Updated ${cachedAge}m ago`}
          {' · '}Refreshes every 4 hours
        </div>
      )}

      <style>{FOCUS_STYLES}</style>
    </motion.div>
  );
}

const FOCUS_STYLES = `
.focus-card {
  padding: 22px 24px;
  border-radius: var(--radius-lg);
  display: flex;
  flex-direction: column;
  gap: 12px;
  border-left: 2px solid var(--accent-blue);
}
.focus-loading {
  height: 140px;
  position: relative;
  overflow: hidden;
}
.focus-shimmer {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.03) 50%, transparent 100%);
  background-size: 200% 100%;
  animation: shimmer 1.5s linear infinite;
}
.focus-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.focus-label {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: var(--text-muted);
}
.focus-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: var(--accent-blue);
  box-shadow: 0 0 6px rgba(79,142,247,0.6);
  animation: pulse-dot 2s ease-in-out infinite;
}
@keyframes pulse-dot {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(0.8); }
}
.focus-refresh {
  background: none;
  border: none;
  color: var(--text-disabled);
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;
  display: flex;
  transition: color 0.15s, background 0.15s;
}
.focus-refresh:hover:not(:disabled) {
  color: var(--text-secondary);
  background: var(--bg-overlay);
}
.focus-refresh:disabled { opacity: 0.4; cursor: not-allowed; }
.focus-headline {
  font-size: 18px;
  font-weight: 800;
  color: var(--text-primary);
  letter-spacing: -0.5px;
  line-height: 1.3;
}
.focus-reasoning {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.65;
}
.focus-task {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: rgba(79,142,247,0.06);
  border: 1px solid rgba(79,142,247,0.14);
  border-radius: 8px;
  margin-top: 4px;
}
.focus-task-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--accent-blue);
  white-space: nowrap;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.focus-task-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}
.focus-footer {
  font-size: 11px;
  color: var(--text-disabled);
  margin-top: -4px;
}
@keyframes spin { to { transform: rotate(360deg); } }
`;
