<div align="center">
  <img src="https://raw.githubusercontent.com/tandpfun/skill-icons/main/icons/React-Dark.svg" width="60" alt="Aegis AI Logo" />
  <h1 align="center">Aegis AI</h1>
  <p align="center">
    <strong>Your AI Chief of Staff for Engineering Students</strong>
  </p>
</div>

<br />

## 🚨 The Problem
Engineering students face a unique, intense pressure. Balancing core academics with DSA preparation, building impactful side projects, competing in hackathons, and preparing for internships leaves most students overwhelmed. Traditional to-do apps just act as lists of guilt, while generic AI chat interfaces require too much prompting. 

Students don't need another list. They need a **Chief of Staff**—someone (or something) that looks at their life context, breaks down their massive goals, builds a realistic schedule, and adapts dynamically when life inevitably gets in the way.

## 💡 The Solution: Aegis AI
Aegis AI is an AI Chief of Staff specifically designed for engineering students. It takes your high-level ambitions (e.g., "Win a Hackathon", "Master ML") and your specific life constraints (e.g., "3 hours of free time daily", "College assignments due this week") and synthesizes a master plan. 

As you progress, Aegis conducts a **Daily Review**. If you miss a task because an assignment took too long, Aegis doesn't just send a generic notification—it **automatically replans your workflow**, shifts deadlines intelligently, and tells you exactly what changed and why.

---

## ✨ Key Features

### 🗺️ AI Roadmaps & Project Breakdown
Tell Aegis your goal and how much time you have. It will break the goal into milestones, estimate the effort for individual tasks, build a day-by-day schedule, and identify potential risk factors before you even start.

### 🎯 Manual Tracking & Habit Building
Already have a plan? Use the manual goal creator to plug your milestones into Aegis's system and let it track your health, progress, and completion probabilities alongside your automated goals.

### 📅 Daily Review & Strategic Focus
Every day, your Chief of Staff provides a "Strategic Focus" briefing—a 2-sentence breakdown of what matters most today based on deadlines and risk factors. The Daily Review flow ensures you check off completed items and flag delayed tasks.

### 🔄 Adaptive Replanning
When life happens and a day is missed, Aegis will automatically catch you up. It quietly recalculates your entire schedule behind the scenes, then presents you with a clear summary: *What changed, why it changed, and the impact on your goal health.*

### ❤️ Goal Health & Risk Intelligence
Aegis calculates real-time "Completion Probability" and "Risk Scores" based on your daily consistency, remaining time, and task density. You'll know you're falling behind before it's too late.

---



## 🏗️ Architecture & Tech Stack

Aegis is built with a modern, high-performance web stack prioritizing a sleek, premium (Linear/Arc-inspired) user experience and blazing-fast AI interactions.

- **Frontend Framework:** React 18 + TypeScript + Vite
- **Styling:** Vanilla CSS + CSS Variables (Custom Design System, minimal gradients, high-contrast dark mode)
- **Animation:** Framer Motion (for fluid transitions and micro-interactions)
- **Backend & Database:** Supabase (PostgreSQL, Row Level Security, Auth)
- **AI Engine:** Google Gemini Pro (Function calling and structured JSON output)

## 🚀 Setup & Installation

### 1. Clone the repository
```bash
git clone https://github.com/yourusername/aegis-ai.git
cd aegis-ai
```

### 2. Install dependencies
```bash
npm install
```

### 3. Environment Variables
Create a `.env` file in the root directory based on `.env.example`:
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GEMINI_API_KEY=your_gemini_api_key
```

### 4. Database Setup (Supabase)
Run the provided SQL migrations in your Supabase SQL Editor to set up the `profiles`, `goals`, `milestones`, and `tasks` tables with appropriate RLS policies.

### 5. Run the Development Server
```bash
npm run dev
```

---

## 🚀 Deployment (Vercel)

Aegis AI is fully optimized to be deployed on Vercel. 

1. Push this repository to your GitHub account.
2. Go to [Vercel](https://vercel.com/) and click **Add New... > Project**.
3. Import your GitHub repository.
4. Set the **Framework Preset** to `Vite`.
5. Add your Environment Variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_GEMINI_API_KEY`
6. Click **Deploy**. Vercel will automatically build (`npm run build`) and host your application.

---

## 🛣️ Future Roadmap
- [ ] **GitHub & LeetCode Connect:** Automatically pull in daily activity to adjust available hours dynamically.
- [ ] **Canvas/Blackboard Sync:** Ingest college assignments automatically and block out time for them.
- [ ] **Mobile App (React Native):** Native iOS and Android experiences for daily check-ins on the go.
- [ ] **Pomodoro & Deep Work:** Integrated timer that feeds real-time effort data back into task estimations.

---

<div align="center">
  <p>Built for the engineers of tomorrow. ⚔️</p>
</div>
