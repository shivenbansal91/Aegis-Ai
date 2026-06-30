-- ============================================================
-- MIGRATION: Unified Task Architecture
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. Update Goals Table
-- Add 'goal_type' to identify the source system (ai, manual, habit)
-- Default to 'ai' to preserve backward compatibility for existing goals.
ALTER TABLE public.goals
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'ai' CHECK (type IN ('ai', 'manual', 'habit'));

-- Add habit recurrence metadata
ALTER TABLE public.goals
ADD COLUMN IF NOT EXISTS habit_frequency TEXT DEFAULT 'daily'; -- For V1, defaults to daily

-- 2. Update Tasks Table
-- Add 'source' to identify where the task originated from.
-- Default to 'ai' to preserve backward compatibility.
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'ai' CHECK (source IN ('ai', 'manual', 'habit'));

-- We keep ai_generated for now as a fallback if anything relies on it,
-- but the new unified architecture uses `source`.

-- 3. Update Existing Data (Optional but recommended)
UPDATE public.tasks SET source = 'ai' WHERE source IS NULL;
UPDATE public.goals SET type = 'ai' WHERE type IS NULL;
