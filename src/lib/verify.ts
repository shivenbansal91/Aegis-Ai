// ============================================================
// AEGIS AI — Verification Service
// Checks GitHub commits and LeetCode submissions using
// public APIs — no OAuth required.
// ============================================================

export interface GitHubVerification {
  verified: boolean;
  commitsToday: number;
  repos: string[];
  prsOpened: number;
  error?: string;
}

export interface LeetCodeVerification {
  verified: boolean;
  solvedToday: number;
  totalSolved: number;
  streak: number;
  recentProblems: { title: string; difficulty: string }[];
  error?: string;
}

export interface VerificationResult {
  github?: GitHubVerification;
  leetcode?: LeetCodeVerification;
  ranAt: string;
}

// ── GitHub ────────────────────────────────────────────────────
// Uses the public GitHub Events API — no auth needed for public accounts

export async function verifyGitHub(username: string): Promise<GitHubVerification> {
  try {
    const res = await fetch(
      `https://api.github.com/users/${encodeURIComponent(username)}/events/public?per_page=100`,
      { headers: { Accept: 'application/vnd.github.v3+json' } }
    );

    if (!res.ok) {
      if (res.status === 404) return { verified: false, commitsToday: 0, repos: [], prsOpened: 0, error: `GitHub user "${username}" not found.` };
      throw new Error(`GitHub API ${res.status}`);
    }

    const events = await res.json();
    const today = new Date().toISOString().split('T')[0];

    const todayEvents = events.filter((e: any) =>
      e.created_at?.startsWith(today)
    );

    let commitsToday = 0;
    const repoSet = new Set<string>();
    let prsOpened = 0;

    for (const event of todayEvents) {
      if (event.type === 'PushEvent') {
        commitsToday += event.payload?.commits?.length ?? 0;
        repoSet.add(event.repo?.name ?? '');
      }
      if (event.type === 'PullRequestEvent' && event.payload?.action === 'opened') {
        prsOpened++;
        repoSet.add(event.repo?.name ?? '');
      }
    }

    return {
      verified: true,
      commitsToday,
      repos: [...repoSet].filter(Boolean),
      prsOpened,
    };
  } catch (err) {
    return {
      verified: false,
      commitsToday: 0,
      repos: [],
      prsOpened: 0,
      error: err instanceof Error ? err.message : 'GitHub verification failed.',
    };
  }
}

// ── Fetch with timeout ────────────────────────────────────────
function fetchWithTimeout(url: string, ms = 10000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return fetch(url, { signal: controller.signal }).finally(() => clearTimeout(timer));
}

// ── LeetCode ──────────────────────────────────────────────────
// Uses third-party proxy APIs to avoid CORS — tries multiple in order

export async function verifyLeetCode(username: string): Promise<LeetCodeVerification> {
  const slug = encodeURIComponent(username.trim());

  // ── Attempt 1: alfa-leetcode-api (Render, CORS-enabled) ──
  try {
    const [profileRes, calendarRes] = await Promise.all([
      fetchWithTimeout(`https://alfa-leetcode-api.onrender.com/${slug}/solved`, 10000),
      fetchWithTimeout(`https://alfa-leetcode-api.onrender.com/${slug}/calendar`, 10000),
    ]);

    if (profileRes.ok) {
      const profile = await profileRes.json();
      const totalSolved = profile.solvedProblem ?? profile.totalSolved ?? 0;

      let solvedToday = 0;
      let streak = 0;

      if (calendarRes.ok) {
        const cal = await calendarRes.json();
        const calendar: Record<string, number> = cal.submissionCalendar
          ? (typeof cal.submissionCalendar === 'string'
              ? JSON.parse(cal.submissionCalendar)
              : cal.submissionCalendar)
          : {};

        const now = new Date();
        const todayUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) / 1000;
        solvedToday = calendar[String(todayUTC)] ?? 0;

        // Count streak
        let day = todayUTC;
        const DAY = 86400;
        while (day >= todayUTC - 365 * DAY) {
          if (calendar[String(day)]) { streak++; day -= DAY; }
          else if (day === todayUTC) { day -= DAY; } // today might be 0, check yesterday
          else break;
        }
      }

      return { verified: true, solvedToday, totalSolved, streak, recentProblems: [] };
    }
  } catch {
    // timeout or network error — try next
  }

  // ── Attempt 2: leetcode-stats-api (alternate instance) ──
  try {
    const res = await fetchWithTimeout(
      `https://leetcode-stats-api.herokuapp.com/${slug}`, 8000
    );
    if (res.ok) {
      const data = await res.json();
      if (data.status !== 'error') {
        const totalSolved = data.totalSolved ?? 0;
        let solvedToday = 0;
        let streak = 0;

        if (data.submissionCalendar) {
          const calendar: Record<string, number> =
            typeof data.submissionCalendar === 'string'
              ? JSON.parse(data.submissionCalendar)
              : data.submissionCalendar;
          const now = new Date();
          const todayUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) / 1000;
          solvedToday = calendar[String(todayUTC)] ?? 0;
          const DAY = 86400;
          let day = todayUTC;
          while (calendar[String(day)]) { streak++; day -= DAY; if (streak > 365) break; }
        }
        return { verified: true, solvedToday, totalSolved, streak, recentProblems: [] };
      }
    }
  } catch {
    // try next
  }

  // ── Attempt 3: validate username exists via public badge API ──
  try {
    const res = await fetchWithTimeout(
      `https://leetcode-badge-sage.vercel.app/api/badge?username=${slug}&theme=dark`, 6000
    );
    if (res.ok) {
      // Username is valid even if we can't get detailed stats
      return {
        verified: true,
        solvedToday: 0,
        totalSolved: 0,
        streak: 0,
        recentProblems: [],
      };
    }
  } catch {
    // all failed
  }

  return {
    verified: false,
    solvedToday: 0,
    totalSolved: 0,
    streak: 0,
    recentProblems: [],
    error: `All LeetCode APIs are currently unreachable (they are free third-party services). Your username is saved — verification will run during check-ins when services recover.`,
  };
}

// ── Run all verifications ─────────────────────────────────────

export async function runVerifications(params: {
  githubUsername?: string;
  leetcodeHandle?: string;
}): Promise<VerificationResult> {
  const result: VerificationResult = { ranAt: new Date().toISOString() };

  const promises: Promise<void>[] = [];

  if (params.githubUsername?.trim()) {
    promises.push(
      verifyGitHub(params.githubUsername.trim()).then(r => { result.github = r; })
    );
  }

  if (params.leetcodeHandle?.trim()) {
    promises.push(
      verifyLeetCode(params.leetcodeHandle.trim()).then(r => { result.leetcode = r; })
    );
  }

  await Promise.all(promises);
  return result;
}

// ── Format for Gemini prompt ──────────────────────────────────

export function formatVerificationForPrompt(v: VerificationResult): string {
  const parts: string[] = [];

  if (v.github) {
    if (v.github.error) {
      parts.push(`GitHub: Could not verify (${v.github.error})`);
    } else {
      parts.push(
        `GitHub activity today: ${v.github.commitsToday} commits across ${v.github.repos.length} repos` +
        (v.github.prsOpened > 0 ? `, ${v.github.prsOpened} PR(s) opened` : '') +
        (v.github.repos.length > 0 ? ` (${v.github.repos.slice(0, 3).join(', ')})` : '') +
        (v.github.commitsToday === 0 ? ' — NO commits found today.' : '')
      );
    }
  }

  if (v.leetcode) {
    if (v.leetcode.error) {
      parts.push(`LeetCode: Could not verify (${v.leetcode.error})`);
    } else {
      parts.push(
        `LeetCode today: ${v.leetcode.solvedToday} problem(s) solved` +
        (v.leetcode.recentProblems.length > 0
          ? ` (${v.leetcode.recentProblems.map(p => `${p.title} [${p.difficulty}]`).join(', ')})`
          : '') +
        `. Overall streak: ${v.leetcode.streak} days. Total solved: ${v.leetcode.totalSolved}.` +
        (v.leetcode.solvedToday === 0 ? ' — NO problems solved today.' : '')
      );
    }
  }

  return parts.length > 0
    ? `\nAUTOMATED VERIFICATION DATA (cross-reference with user's self-report):\n${parts.join('\n')}`
    : '';
}
