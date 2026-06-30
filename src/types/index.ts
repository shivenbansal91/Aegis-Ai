// ============================================================
// AEGIS AI — TypeScript Types
// ============================================================

export type Priority = 'low' | 'medium' | 'high' | 'critical';
export type GoalStatus = 'active' | 'completed' | 'paused' | 'failed';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'missed' | 'skipped';
export type MilestoneStatus = 'pending' | 'in_progress' | 'completed' | 'missed';
export type HealthLabel = 'excellent' | 'good' | 'warning' | 'critical';
export type GoalMode = 'simple' | 'project' | 'learning' | 'custom';
export type WorkTime = 'morning' | 'afternoon' | 'evening' | 'night';
export type UserRole = 'student' | 'professional' | 'founder' | 'other';

export type Commitment =
  | 'college'
  | 'dsa'
  | 'internship'
  | 'aiml'
  | 'side_projects'
  | 'hackathons'
  | 'competitive_programming'
  | 'research'
  | 'startup';

export interface Profile {
  id: string;
  email: string;
  display_name: string;
  avatar_url?: string;
  timezone: string;
  preferred_work_start: number;
  preferred_work_end: number;
  onboarding_complete: boolean;
  created_at: string;
}

// ============================================================
// LIFE CONTEXT — User's current life situation for AI context
// ============================================================

export interface LifeContext {
  id?: string;
  user_id?: string;

  // Academic / Professional Profile
  role: UserRole;
  university?: string;
  current_semester?: number;
  graduation_year?: number;

  // Active commitments
  active_commitments: Commitment[];

  // Schedule
  avg_free_hours_per_day: number;
  preferred_work_time: WorkTime;
  weekend_available: boolean;

  // Connected services (mirrors from profile)
  github_username?: string;
  leetcode_handle?: string;

  // AI-generated context summary (cached)
  ai_summary?: string;

  updated_at?: string;
}

export const COMMITMENT_LABELS: Record<Commitment, string> = {
  college: 'College',
  dsa: 'DSA Practice',
  internship: 'Internship Preparation',
  aiml: 'AI/ML Learning',
  side_projects: 'Side Projects',
  hackathons: 'Hackathons',
  competitive_programming: 'Competitive Programming',
  research: 'Research',
  startup: 'Startup',
};

export const DEFAULT_LIFE_CONTEXT: Omit<LifeContext, 'user_id'> = {
  role: 'student',
  active_commitments: [],
  avg_free_hours_per_day: 3,
  preferred_work_time: 'evening',
  weekend_available: true,
};

export interface Goal {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  deadline: string;
  daily_hours_available: number;
  priority: Priority;
  status: GoalStatus;
  health_score: number;
  completion_probability: number;
  risk_score: number;
  ai_plan?: AIPlan;
  // New Unified Architecture Fields
  type: 'ai' | 'manual' | 'habit';
  habit_frequency?: string;
  
  // Today's Focus cache
  focus_reason?: string;
  focus_generated_at?: string;
  created_at: string;
  updated_at: string;
  // relations
  milestones?: Milestone[];
  tasks?: Task[];
}

export interface Milestone {
  id: string;
  goal_id: string;
  title: string;
  description?: string;
  due_date?: string;
  status: MilestoneStatus;
  order_index: number;
  created_at: string;
  tasks?: Task[];
}

export interface Task {
  id: string;
  goal_id: string;
  milestone_id?: string;
  title: string;
  description?: string;
  estimated_hours: number;
  due_date?: string;
  status: TaskStatus;
  priority: Priority;
  ai_generated?: boolean; // legacy
  source: 'ai' | 'manual' | 'habit';
  order_index: number;
  // Smart categorization for simple tasks
  category?: 'academic' | 'career' | 'projects' | 'personal' | 'habits';
  created_at: string;
  updated_at: string;
}

export interface DailyCheckin {
  id: string;
  user_id: string;
  goal_id: string;
  date: string;
  completed_task_ids: string[];
  partial_task_ids: string[];
  blocked_task_ids: string[];
  notes?: string;
  ai_feedback?: string;
  ai_updated_plan?: AIPlan;
  risk_before?: number;
  risk_after?: number;
  created_at: string;
}

// ============================================================
// AI PLAN STRUCTURE (returned by Gemini)
// ============================================================

export interface AIPlan {
  summary: string;
  total_estimated_hours: number;
  milestones: AIMilestone[];
  schedule: DaySchedule[];
  risk_factors: string[];
  success_tips: string[];
}

export interface AIMilestone {
  title: string;
  description: string;
  due_date: string;
  tasks: AITask[];
}

export interface AITask {
  title: string;
  description: string;
  estimated_hours: number;
  priority: Priority;
  due_date: string;
}

export interface DaySchedule {
  date: string;
  tasks: string[];
  hours: number;
}

// ============================================================
// GOAL CREATION FORM
// ============================================================

export interface GoalFormData {
  title: string;
  description: string;
  deadline: string;
  daily_hours_available: number;
  priority: Priority;
}

// ============================================================
// TODAY'S FOCUS (AI-generated, cached)
// ============================================================

export interface TodaysFocus {
  task_id: string;
  task_title: string;
  goal_title: string;
  reason: string;           // AI-generated "why this matters"
  estimated_hours: number;
  impact: string;           // e.g. "+12% completion probability"
  priority: Priority;
  generated_at: string;     // ISO date string — for cache invalidation
}

