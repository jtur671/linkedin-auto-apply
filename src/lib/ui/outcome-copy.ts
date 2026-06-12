// src/lib/ui/outcome-copy.ts
// Plain-English copy for Scout's apply outcomes and log activity actions.

const OUTCOME_MAP: Record<string, string> = {
  submitted: "Applied 🎉",
  needs_review: "Your call",
  failed: "Didn't go through",
  skipped: "Passed",
};

/** Maps a DB applyOutcome value to a friendly Scout label. */
export function outcomeCopy(outcome: string | null | undefined): string {
  if (!outcome) return "Found";
  return OUTCOME_MAP[outcome] ?? humanize(outcome);
}

const ACTIVITY_MAP: Record<
  string,
  string | ((d: Record<string, unknown>) => string)
> = {
  // Discovery sweep lifecycle
  indeed_start: "🔎 Started looking for jobs",
  indeed_stop: "✅ Finished a search sweep",
  indeed_error: "⚠️ Hit a snag while searching",

  // Automation (LinkedIn / general engine) lifecycle
  automation_start: "🚀 Scout started running",
  automation_stop: "🛑 Scout stopped",

  // Login flows
  login_success: "🔓 Signed in successfully",
  login_fail: "🔒 Sign-in didn't work",
  login_cookie_reuse: "🍪 Resumed a saved session",

  // Apply outcomes
  apply_success: (d) => `🎉 Applied to ${d.company ?? "a job"}`,
  apply_skip: (d) =>
    d.company ? `⏭️ Skipped ${d.company}` : "⏭️ Skipped a job",
  apply_error: (d) =>
    d.company
      ? `❌ Couldn't apply to ${d.company}`
      : "❌ Couldn't apply to that one",

  // Search phases
  search_start: "🔍 Starting a search",
  search_results: (d) =>
    typeof d.count === "number"
      ? `📋 Found ${d.count} jobs`
      : "📋 Found some jobs",
  search_debug: "🐛 Search debug info",

  // Rate-limiting / anti-bot
  rate_limited: "🐢 Slowing down — hit a rate limit",
  captcha_detected: "🤖 Ran into a captcha — pausing",
};

/** Maps a log action name (+ optional details) to a Scout-voice sentence. */
export function activityCopy(
  action: string,
  details: Record<string, unknown> = {},
): string {
  const entry = ACTIVITY_MAP[action];
  if (typeof entry === "function") return entry(details);
  if (entry) return entry;
  return humanize(action);
}

function humanize(s: string): string {
  const words = s.replace(/_/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}
