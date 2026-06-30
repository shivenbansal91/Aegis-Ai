import type { GoalFormData, AIPlan } from '../types';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

async function callGemini(prompt: string): Promise<string> {
  const response = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini API error: ${response.status} — ${err}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

// ============================================================
// GOAL DECOMPOSITION — called when user creates a goal
// ============================================================

export async function generateGoalPlan(form: GoalFormData): Promise<AIPlan> {
  const today = new Date().toISOString().split('T')[0];
  const deadlineDate = new Date(form.deadline);
  const todayDate = new Date(today);
  const daysRemaining = Math.ceil(
    (deadlineDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  const totalAvailableHours = daysRemaining * form.daily_hours_available;

  const prompt = `You are an expert AI project planner and chief of staff. A user wants to achieve the following goal and needs a detailed, realistic execution plan.

GOAL: ${form.title}
DESCRIPTION: ${form.description || 'No additional description provided.'}
DEADLINE: ${form.deadline} (${daysRemaining} days from today, ${today})
DAILY HOURS AVAILABLE: ${form.daily_hours_available} hours/day
TOTAL AVAILABLE HOURS: ~${totalAvailableHours} hours
PRIORITY: ${form.priority}

Your task: Create a comprehensive, actionable execution plan. Be specific, realistic, and practical.

Return ONLY a valid JSON object (no markdown, no code blocks) matching this EXACT schema:

{
  "summary": "2-3 sentence executive summary of the plan and strategy",
  "total_estimated_hours": <number>,
  "milestones": [
    {
      "title": "Milestone title",
      "description": "What this milestone achieves",
      "due_date": "YYYY-MM-DD",
      "tasks": [
        {
          "title": "Specific task title",
          "description": "Exactly what to do",
          "estimated_hours": <number>,
          "priority": "high" | "medium" | "low",
          "due_date": "YYYY-MM-DD"
        }
      ]
    }
  ],
  "schedule": [
    {
      "date": "YYYY-MM-DD",
      "tasks": ["task title 1", "task title 2"],
      "hours": <number>
    }
  ],
  "risk_factors": ["risk 1", "risk 2", "risk 3"],
  "success_tips": ["tip 1", "tip 2", "tip 3"]
}

Rules:
- Create 3-5 milestones, each with 2-6 concrete tasks
- Total estimated hours must be ≤ ${totalAvailableHours}
- All dates must be between ${today} and ${form.deadline}
- Tasks must be specific and actionable (not vague like "work on project")
- Schedule should only include working days (skip if too many days)
- For hackathons/short deadlines: front-load the hardest work
- For learning goals: use spaced repetition principles
- Prioritize tasks that unblock other tasks`;

  const raw = await callGemini(prompt);

  try {
    const parsed = JSON.parse(raw);
    return parsed as AIPlan;
  } catch {
    // Try to extract JSON if there's extra text
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]) as AIPlan;
    throw new Error('Failed to parse AI plan. Raw response: ' + raw.slice(0, 200));
  }
}

// ============================================================
// DAILY CHECK-IN ANALYSIS — called after user submits check-in
// ============================================================

export async function analyzeCheckin(params: {
  goalTitle: string;
  completedTasks: string[];
  partialTasks: string[];
  blockedTasks: string[];
  plannedTasks: string[];
  notes: string;
  daysRemaining: number;
  currentRisk: number;
  verificationContext?: string; // formatted GitHub/LeetCode data
}): Promise<{ feedback: string; newRisk: number; recommendations: string[] }> {
  const prompt = `You are an AI Chief of Staff analyzing a user's daily progress check-in.

GOAL: ${params.goalTitle}
DAYS REMAINING: ${params.daysRemaining}
CURRENT RISK SCORE: ${params.currentRisk}/100

TODAY'S SELF-REPORTED PROGRESS:
- Planned tasks: ${params.plannedTasks.join(', ') || 'none'}
- Completed: ${params.completedTasks.join(', ') || 'none'}
- Partially done: ${params.partialTasks.join(', ') || 'none'}
- Blocked: ${params.blockedTasks.join(', ') || 'none'}
- User notes: ${params.notes || 'none'}
${params.verificationContext ? params.verificationContext : ''}

${params.verificationContext ? `IMPORTANT: You have automated verification data above. Cross-reference it with the user's self-report. If the user claims coding tasks are done but GitHub shows 0 commits, or claims LeetCode problems were solved but there are none — call it out constructively and adjust the risk score upward. If the data matches or exceeds their report, reward with lower risk.` : ''}

Return ONLY valid JSON:
{
  "feedback": "2-3 sentence honest, constructive feedback. If verification data contradicts self-report, mention it specifically.",
  "newRisk": <number 0-100>,
  "recommendations": ["specific action 1", "specific action 2", "specific action 3"]
}`;

  const raw = await callGemini(prompt);
  try {
    return JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    return {
      feedback: 'Progress noted. Keep pushing forward.',
      newRisk: params.currentRisk,
      recommendations: ['Continue with your plan', 'Focus on blocked tasks', 'Review your schedule'],
    };
  }
}

// ============================================================
// REPLAN — called when user falls significantly behind
// ============================================================

export async function generateReplan(params: {
  goalTitle: string;
  deadline: string;
  daysRemaining: number;
  dailyHours: number;
  missedTasks: { id: string, title: string }[];
  remainingTasks: { id: string, title: string }[];
}): Promise<{
  reason: string;
  changesSummary: string[];
  newCompletionProbability: number;
  updatedTasks: Array<{ taskId: string; newDate: string }>;
}> {
  const prompt = `You are Aegis, an AI Chief of Staff. A user missed some tasks today for their goal.
You must replan their schedule by pushing delayed tasks forward while keeping the deadline in mind.

GOAL: ${params.goalTitle}
DEADLINE: ${params.deadline}
DAYS REMAINING: ${params.daysRemaining}
DAILY HOURS AVAILABLE: ${params.dailyHours}

MISSED TASKS:
${params.missedTasks.map(t => `- ID: ${t.id} | ${t.title}`).join('\n')}

REMAINING TASKS:
${params.remainingTasks.map(t => `- ID: ${t.id} | ${t.title}`).join('\n')}

Return ONLY valid JSON matching this exact structure:
{
  "reason": "1 concise sentence explaining why the schedule changed (e.g. 'Backend work wasn't completed today, so Aegis adjusted your schedule.')",
  "changesSummary": [
    "Backend -> Tomorrow",
    "UI Polish -> Wednesday"
  ],
  "newCompletionProbability": <number between 1-100 reflecting the new chance of success>,
  "updatedTasks": [
    {
      "taskId": "<the exact ID from above>",
      "newDate": "YYYY-MM-DD"
    }
  ]
}

Make sure to map all remaining and missed tasks to a valid newDate. Do NOT invent new tasks.
Do NOT use markdown blocks, just raw JSON.`;

  const raw = await callGemini(prompt);
  try {
    const parsed = JSON.parse(raw);
    if (parsed.updatedTasks) return parsed;
    throw new Error('Missing fields');
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    return {
      reason: 'Tasks were delayed, so the schedule was automatically adjusted.',
      changesSummary: ['Shifted delayed tasks forward.'],
      newCompletionProbability: 85,
      updatedTasks: [],
    };
  }
}

// ============================================================
// FOCUS BRIEFING — cached daily summary for dashboard
// ============================================================

export async function generateFocusBriefing(
  goals: { title: string; deadline: string; health_score: number; risk_score: number; priority: string }[],
  tasks: { title: string; priority: string; estimated_hours: number }[]
): Promise<{ headline: string; reasoning: string }> {
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const goalsStr = goals.slice(0, 5).map(g =>
    `- "${g.title}" | deadline: ${g.deadline} | health: ${g.health_score}/100 | risk: ${g.risk_score}/100 | priority: ${g.priority}`
  ).join('\n');

  const tasksStr = tasks.slice(0, 5).map(t =>
    `- "${t.title}" | priority: ${t.priority} | effort: ${t.estimated_hours}h`
  ).join('\n') || 'No tasks due today.';

  const prompt = `You are Aegis, an AI Chief of Staff. Today is ${today}.

The user's active goals:
${goalsStr}

Tasks due today:
${tasksStr}

Write a brief strategic focus briefing for this person's day.
Respond ONLY with valid JSON in this exact shape:
{
  "headline": "One sharp, action-oriented sentence (max 12 words) telling them where to focus today",
  "reasoning": "1-2 sentences explaining WHY this is the priority right now — be specific, reference actual goal names or deadlines"
}

Rules:
- headline: direct, no filler words, like a Chief of Staff would say it
- reasoning: honest, reference real context from the goals above
- Do NOT use phrases like "As your AI..." or "Based on analysis..."
- Tone: calm, intelligent, decisive`;

  const raw = await callGemini(prompt);
  try {
    const parsed = JSON.parse(raw);
    if (parsed.headline && parsed.reasoning) return parsed;
    throw new Error('bad shape');
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      if (parsed.headline && parsed.reasoning) return parsed;
    }
    return {
      headline: 'Stay focused on your highest-risk goal today.',
      reasoning: 'Review your active goals and complete at least one task to maintain momentum.',
    };
  }
}
