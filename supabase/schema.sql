-- ============================================================
-- AEGIS AI — SUPABASE SCHEMA
-- Run this in the Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- PROFILES (extends Supabase auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  avatar_url TEXT,
  timezone TEXT DEFAULT 'UTC',
  preferred_work_start INT DEFAULT 9,   -- hour of day (24h)
  preferred_work_end INT DEFAULT 21,    -- hour of day (24h)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- ============================================================
-- GOALS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  deadline DATE NOT NULL,
  daily_hours_available NUMERIC(4,1) DEFAULT 2,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'failed')),
  health_score INT DEFAULT 100 CHECK (health_score BETWEEN 0 AND 100),
  completion_probability INT DEFAULT 80 CHECK (completion_probability BETWEEN 0 AND 100),
  risk_score INT DEFAULT 10 CHECK (risk_score BETWEEN 0 AND 100),
  ai_plan JSONB,               -- full AI-generated plan
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own goals" ON public.goals USING (auth.uid() = user_id);

-- ============================================================
-- MILESTONES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.milestones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'missed')),
  order_index INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own milestones" ON public.milestones
  USING (auth.uid() = (SELECT user_id FROM public.goals WHERE id = goal_id));

-- ============================================================
-- TASKS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  milestone_id UUID REFERENCES public.milestones(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  estimated_hours NUMERIC(4,1) DEFAULT 1,
  due_date DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'missed', 'skipped')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  ai_generated BOOLEAN DEFAULT TRUE,
  order_index INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own tasks" ON public.tasks
  USING (auth.uid() = (SELECT user_id FROM public.goals WHERE id = goal_id));

-- ============================================================
-- DAILY CHECK-INS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.daily_checkins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  completed_task_ids UUID[] DEFAULT '{}',
  partial_task_ids UUID[] DEFAULT '{}',
  blocked_task_ids UUID[] DEFAULT '{}',
  notes TEXT,
  ai_feedback TEXT,
  ai_updated_plan JSONB,
  risk_before INT,
  risk_after INT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, goal_id, date)
);

ALTER TABLE public.daily_checkins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own checkins" ON public.daily_checkins USING (auth.uid() = user_id);

-- ============================================================
-- AI MEMORY
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ai_memory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, key)
);

ALTER TABLE public.ai_memory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own memory" ON public.ai_memory USING (auth.uid() = user_id);

-- ============================================================
-- TRIGGER: Auto-create profile on user signup
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- TRIGGER: Auto-update updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER goals_updated_at BEFORE UPDATE ON public.goals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER tasks_updated_at BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
