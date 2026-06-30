import { supabase } from './supabase';
import type { Goal, Task, AIPlan, LifeContext } from '../types';

// ── LIFE CONTEXT ────────────────────────────────────────────

export async function getLifeContext(userId: string): Promise<LifeContext | null> {
  const { data, error } = await supabase
    .from('life_context')
    .select('*')
    .eq('user_id', userId)
    .single();
  if (error) return null;
  return data as LifeContext;
}

export async function upsertLifeContext(userId: string, ctx: Partial<LifeContext>): Promise<void> {
  const { error } = await supabase
    .from('life_context')
    .upsert({ ...ctx, user_id: userId, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
  if (error) throw error;
}

export async function completeOnboarding(userId: string): Promise<void> {
  await supabase.from('profiles').update({ onboarding_complete: true }).eq('id', userId);
}

// ── SIMPLE TASK (no AI) ─────────────────────────────────────



export async function createSimpleTask(params: {
  userId: string;
  title: string;
  estimatedHours?: number;
  dueDate?: string;
  priority?: string;
}): Promise<string> {

  // Find if there's a related active goal to attach to
  const { data: goals } = await supabase
    .from('goals')
    .select('id, title')
    .eq('user_id', params.userId)
    .eq('status', 'active');

  // Try to find a matching goal
  let goalId: string | null = null;
  if (goals?.length) {
    const titleLower = params.title.toLowerCase();
    const match = goals.find(g =>
      g.title.toLowerCase().split(' ').some((word: string) =>
        word.length > 3 && titleLower.includes(word)
      )
    );
    if (match) goalId = match.id;
  }

  // If no match, use/create a default "Quick Tasks" goal
  if (!goalId) {
    const { data: existing } = await supabase
      .from('goals')
      .select('id')
      .eq('user_id', params.userId)
      .eq('title', 'Quick Tasks')
      .single();

    if (existing) {
      goalId = existing.id;
    } else {
      const deadline = new Date();
      deadline.setFullYear(deadline.getFullYear() + 1);
      const { data: newGoal } = await supabase
        .from('goals')
        .insert({
          user_id: params.userId,
          title: 'Quick Tasks',
          description: 'Auto-created bucket for standalone tasks',
          deadline: deadline.toISOString().split('T')[0],
          daily_hours_available: 1,
          priority: 'medium',
          status: 'active',
          health_score: 100,
          completion_probability: 100,
          risk_score: 0,
        })
        .select('id')
        .single();
      if (newGoal) goalId = newGoal.id;
    }
  }

  if (!goalId) throw new Error('Could not find or create a goal for this task');

  const { data: task, error } = await supabase
    .from('tasks')
    .insert({
      goal_id: goalId,
      title: params.title,
      estimated_hours: params.estimatedHours ?? 1,
      due_date: params.dueDate,
      priority: params.priority ?? 'medium',
      status: 'pending',
      ai_generated: false,
      order_index: 0,
    })
    .select('id')
    .single();

  if (error) throw error;
  return task.id;
}


// ── GOALS ──────────────────────────────────────────────────

export async function createGoalWithPlan(params: {
  userId: string;
  title: string;
  description: string;
  deadline: string;
  dailyHours: number;
  priority: string;
  plan: AIPlan;
  type?: 'ai' | 'manual' | 'habit';
  habit_frequency?: string;
}): Promise<string> {
  const goalType = params.type || 'ai';
  // 1. Insert goal
  const { data: goal, error: goalErr } = await supabase
    .from('goals')
    .insert({
      user_id: params.userId,
      title: params.title,
      description: params.description,
      deadline: params.deadline,
      daily_hours_available: params.dailyHours,
      priority: params.priority,
      ai_plan: params.plan,
      health_score: 100,
      completion_probability: 85,
      risk_score: 15,
      type: goalType,
      habit_frequency: params.habit_frequency,
    })
    .select('id')
    .single();

  if (goalErr) throw goalErr;
  const goalId = goal.id as string;

  // 2. Insert milestones + tasks
  for (let mIdx = 0; mIdx < params.plan.milestones.length; mIdx++) {
    const m = params.plan.milestones[mIdx];

    const { data: milestone, error: mErr } = await supabase
      .from('milestones')
      .insert({
        goal_id: goalId,
        title: m.title,
        description: m.description,
        due_date: m.due_date,
        status: 'pending',
        order_index: mIdx,
      })
      .select('id')
      .single();

    if (mErr) throw mErr;

    if (m.tasks?.length) {
      const taskRows = m.tasks.map((t, tIdx) => ({
        goal_id: goalId,
        milestone_id: milestone.id,
        title: t.title,
        description: t.description,
        estimated_hours: t.estimated_hours,
        due_date: t.due_date,
        priority: t.priority,
        status: 'pending',
        source: goalType,
        order_index: tIdx,
      }));

      const { error: tErr } = await supabase.from('tasks').insert(taskRows);
      if (tErr) throw tErr;
    }
  }

  return goalId;
}

export async function getUserGoals(userId: string): Promise<Goal[]> {
  const { data, error } = await supabase
    .from('goals')
    .select(`
      *,
      milestones(*),
      tasks(*)
    `)
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as Goal[];
}

export async function getGoalById(goalId: string): Promise<Goal | null> {
  const { data, error } = await supabase
    .from('goals')
    .select(`
      *,
      milestones(*, tasks(*)),
      tasks(*)
    `)
    .eq('id', goalId)
    .single();

  if (error) return null;
  return data as Goal;
}

export async function updateGoalRisk(goalId: string, riskScore: number, completionProbability: number, healthScore: number) {
  await supabase
    .from('goals')
    .update({ risk_score: riskScore, completion_probability: completionProbability, health_score: healthScore })
    .eq('id', goalId);
}

// ── TASKS ──────────────────────────────────────────────────

export async function updateTaskStatus(taskId: string, status: Task['status']) {
  const { error } = await supabase
    .from('tasks')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', taskId);
  if (error) throw error;
}

export async function getTodaysTasks(userId: string): Promise<Task[]> {
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('tasks')
    .select('*, goals!inner(user_id, title, status, type, habit_frequency)')
    .eq('goals.user_id', userId)
    .eq('goals.status', 'active')
    .lte('due_date', today)
    .eq('status', 'pending')
    .order('priority', { ascending: false })
    .limit(30);

  if (error) return [];
  const existingTasks = (data ?? []) as (Task & { goals: any })[];

  // Dynamic Habit Task Generation
  const { data: habitGoals } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .eq('type', 'habit');

  if (habitGoals && habitGoals.length > 0) {
    for (const habit of habitGoals) {
      // For V1, assuming 'daily' frequency for all habits.
      const hasTodayTask = existingTasks.some(t => t.goal_id === habit.id && t.due_date === today);
      if (!hasTodayTask) {
        // Automatically spawn today's occurrence
        const { data: newHabitTask } = await supabase.from('tasks').insert({
          goal_id: habit.id,
          title: habit.title,
          description: habit.description || 'Daily habit occurrence',
          estimated_hours: habit.daily_hours_available || 1,
          due_date: today,
          status: 'pending',
          priority: habit.priority,
          source: 'habit'
        }).select('*, goals!inner(user_id, title, status, type, habit_frequency)').single();
        
        if (newHabitTask) {
          existingTasks.push(newHabitTask as any);
        }
      }
    }
  }

  return existingTasks;
}

export async function applyReplanUpdates(goalId: string, taskUpdates: Array<{taskId: string, newDate: string}>, newProb: number) {
  // Update goal probability
  await supabase.from('goals').update({ completion_probability: newProb }).eq('id', goalId);
  // Update each task's due date
  for (const update of taskUpdates) {
    await supabase.from('tasks').update({ due_date: update.newDate }).eq('id', update.taskId);
  }
}

export async function deleteGoal(goalId: string) {
  // Delete the goal (assumes ON DELETE CASCADE for tasks/milestones/checkins, or that they are cleaned up)
  const { error } = await supabase.from('goals').delete().eq('id', goalId);
  if (error) throw error;
}

export async function createMilestone(goalId: string, title: string, dueDate?: string) {
  const { data, error } = await supabase.from('milestones').insert({
    goal_id: goalId,
    title,
    due_date: dueDate,
    status: 'pending'
  }).select().single();
  if (error) throw error;
  return data;
}

export async function createTask(task: Partial<Task> & { goal_id: string, title: string }) {
  const { data, error } = await supabase.from('tasks').insert({
    ...task,
    status: 'pending',
    source: task.source || 'manual'
  }).select().single();
  if (error) throw error;
  return data;
}
