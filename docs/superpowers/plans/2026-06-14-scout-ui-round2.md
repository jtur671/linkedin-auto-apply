# Scout UI Round 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax. **Visual note:** the user invoked the `frontend-design` skill — Tasks 4 & 6 (the card ring usage and the three-zone Home) specify structure, data contracts, and copy exactly but leave pixel execution to that skill's standard (distinctive, polished, no generic-AI look). Tasks 1, 2, 3, 5 are exact code — follow verbatim.

**Goal:** Remove the onboarding wizard + its first-run gate, rework Home into a three-zone command center, give every job a score-ring, add designed empty/first-run states, and group the activity feed.

**Architecture:** Pure UI layer over the existing Scout app — delete onboarding files + strip the layout gate; one shared `ScoreRing` component; one pure `groupActivity()` helper; rewrite `src/app/page.tsx`. No engine/source/applier/API/schema changes.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind v4, shadcn/base-ui, date-fns, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-06-14-scout-ui-round2-design.md` (read it). **Branch:** `scout-ui-round2` (already created). Baseline: 205 vitest + 49 e2e + 8 automation green; dev server runs at localhost:3000 — never restart it; verify over live HTTP.

---

## File map

- **Delete:** `src/app/onboarding/`, `src/components/onboarding/`, `src/app/api/onboarding/`, `src/lib/onboarding.ts`, `tests/unit/onboarding.test.ts`, `tests/e2e/onboarding.spec.ts`.
- **Create:** `src/lib/ui/group-activity.ts` (+test), `src/components/scout/score-ring.tsx`.
- **Modify:** `src/components/layout-shell.tsx` (strip gate), `src/app/settings/page.tsx` (drop re-run link), `src/components/scout/activity-feed.tsx` (use grouping), `src/components/scout/queue-card.tsx` (ring), `src/app/jobs/page.tsx` + `src/app/jobs/[id]/page.tsx` (ring), `src/app/page.tsx` (three-zone rewrite), `tests/e2e/dashboard.spec.ts`.

---

### Task 1: Remove onboarding + strip the first-run gate

**Files:** Delete the onboarding files above; modify `src/components/layout-shell.tsx`, `src/app/settings/page.tsx`.

- [ ] **Step 1: Delete the onboarding files**

```bash
git rm -r src/app/onboarding src/components/onboarding src/app/api/onboarding src/lib/onboarding.ts tests/unit/onboarding.test.ts tests/e2e/onboarding.spec.ts
```

- [ ] **Step 2: Rewrite `src/components/layout-shell.tsx`** to remove the gate, the `checking` loading flash, and the `/onboarding` special-case:

```tsx
"use client";

import { Sidebar } from "@/components/sidebar";

export function LayoutShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto p-6 bg-gradient-to-br from-background to-accent/40">
        {children}
      </main>
    </div>
  );
}
```

- [ ] **Step 3: Remove the "Re-run setup" link** in `src/app/settings/page.tsx`. Find the `<Link href="/onboarding" …>Re-run setup</Link>` (around line 124) and delete that element (and any now-unused `Link` import if nothing else uses it — check with `grep -n "Link" src/app/settings/page.tsx`).

- [ ] **Step 4: Confirm nothing else references onboarding**

Run: `grep -rniE "onboard" src --include='*.ts' --include='*.tsx'`
Expected: no matches (empty output).

- [ ] **Step 5: Verify** — `npx tsc --noEmit` clean; `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/` → 200 and loads with NO "Loading…" flash; `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/onboarding` → 404.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat(scout): remove onboarding wizard and its first-run gate"
```

---

### Task 2: `groupActivity()` pure helper

Collapses **consecutive** activity entries that share an action **and** company into one group with a count + most-recent timestamp. Input is newest-first (as the feed renders).

**Files:** Create `src/lib/ui/group-activity.ts`, `tests/unit/ui/group-activity.test.ts`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/ui/group-activity.test.ts
import { describe, it, expect } from "vitest";
import { groupActivity } from "@/lib/ui/group-activity";

const e = (action: string, ts: string, company?: string) => ({
  timestamp: ts,
  action,
  ...(company ? { job: { company } } : {}),
});

describe("groupActivity", () => {
  it("collapses consecutive same-action entries into one group with a count", () => {
    const g = groupActivity([
      e("indeed_start", "2026-06-14T10:03:00Z"),
      e("indeed_start", "2026-06-14T10:02:00Z"),
      e("indeed_start", "2026-06-14T10:01:00Z"),
    ]);
    expect(g).toHaveLength(1);
    expect(g[0].action).toBe("indeed_start");
    expect(g[0].count).toBe(3);
    expect(g[0].timestamp).toBe("2026-06-14T10:03:00Z"); // newest in group
  });

  it("keeps apply events for different companies separate", () => {
    const g = groupActivity([
      e("apply_success", "2026-06-14T10:05:00Z", "Figma"),
      e("apply_success", "2026-06-14T10:04:00Z", "Notion"),
    ]);
    expect(g).toHaveLength(2);
    expect(g[0].details.company).toBe("Figma");
    expect(g[1].details.company).toBe("Notion");
  });

  it("does not merge non-adjacent groups", () => {
    const g = groupActivity([
      e("indeed_start", "t5"),
      e("apply_success", "t4", "Figma"),
      e("indeed_start", "t3"),
    ]);
    expect(g.map((x) => x.action)).toEqual(["indeed_start", "apply_success", "indeed_start"]);
    expect(g.every((x) => x.count === 1)).toBe(true);
  });

  it("returns [] for []", () => {
    expect(groupActivity([])).toEqual([]);
  });
});
```

- [ ] **Step 2:** Run `npx vitest run tests/unit/ui/group-activity.test.ts` → FAIL (module not found).

- [ ] **Step 3: Implement**

```ts
// src/lib/ui/group-activity.ts
export interface RawActivity {
  timestamp: string;
  action: string;
  job?: { title?: string; company?: string };
  details?: Record<string, unknown>;
}

export interface GroupedActivity {
  action: string;
  details: Record<string, unknown>;
  count: number;
  timestamp: string; // most recent in the group (input is newest-first)
}

// Group consecutive entries sharing (action, company). Adjacent only — a later
// run of the same action after something else starts a new group.
export function groupActivity(entries: RawActivity[]): GroupedActivity[] {
  const out: GroupedActivity[] = [];
  for (const entry of entries) {
    const details = {
      company: entry.job?.company,
      title: entry.job?.title,
      ...entry.details,
    };
    const last = out[out.length - 1];
    const sameCompany = (last?.details.company ?? null) === (details.company ?? null);
    if (last && last.action === entry.action && sameCompany) {
      last.count += 1; // newest timestamp already on the group (first seen wins)
    } else {
      out.push({ action: entry.action, details, count: 1, timestamp: entry.timestamp });
    }
  }
  return out;
}
```

- [ ] **Step 4:** Run the test → PASS. `npx tsc --noEmit` clean.
- [ ] **Step 5: Commit** — `git add src/lib/ui/group-activity.ts tests/unit/ui/group-activity.test.ts && git commit -m "feat(scout): groupActivity helper to collapse repeated feed events"`

---

### Task 3: `ScoreRing` component

**Files:** Create `src/components/scout/score-ring.tsx`.

- [ ] **Step 1: Implement** (no unit test — pure presentational; verified visually):

```tsx
// src/components/scout/score-ring.tsx
import { cn } from "@/lib/utils";

// Circular match-score ring. null score → muted dashed "—" (never a fake 0%).
export function ScoreRing({
  score,
  size = 46,
  className,
}: {
  score: number | null | undefined;
  size?: number;
  className?: string;
}) {
  if (score == null) {
    return (
      <div
        title="Not scored yet"
        style={{ width: size, height: size }}
        className={cn(
          "grid shrink-0 place-items-center rounded-full border-2 border-dashed border-border text-sm font-bold text-muted-foreground",
          className,
        )}
      >
        —
      </div>
    );
  }
  const pct = Math.max(0, Math.min(100, Math.round(score)));
  // tier color: strong / okay / weak
  const fill =
    pct >= 75 ? "var(--color-primary)" : pct >= 50 ? "var(--color-chart-4)" : "var(--color-muted-foreground)";
  return (
    <div
      role="img"
      aria-label={`${pct}% match`}
      style={{ width: size, height: size, background: `conic-gradient(${fill} ${pct}%, var(--color-border) 0)` }}
      className={cn("grid shrink-0 place-items-center rounded-full", className)}
    >
      <div
        style={{ width: size - 10, height: size - 10, fontSize: size * 0.3 }}
        className="grid place-items-center rounded-full bg-card font-extrabold tabular-nums text-foreground"
      >
        {pct}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify** — `npx tsc --noEmit` clean.
- [ ] **Step 3: Commit** — `git add src/components/scout/score-ring.tsx && git commit -m "feat(scout): ScoreRing match visualization"`

---

### Task 4: Use ScoreRing everywhere a score shows (frontend-design polish)

Replace the `MatchBadge` score display with `ScoreRing` on the queue card, the Jobs list rows, and the detail header — so the score reads identically everywhere.

**Files:** `src/components/scout/queue-card.tsx`, `src/app/jobs/page.tsx`, `src/components/scout/job-table.tsx` (if the Found list uses it), `src/app/jobs/[id]/page.tsx`.

- [ ] **Step 1:** In `queue-card.tsx` `CardHead`, replace `<MatchBadge score={job.matchScore} />` with `<ScoreRing score={job.matchScore} />` (import from `@/components/scout/score-ring`; drop the `MatchBadge` import if now unused there). Keep the rest of the card (title/company/source/salary/actions) intact.
- [ ] **Step 2:** In the Jobs list rows (`src/app/jobs/page.tsx` and/or `src/components/scout/job-table.tsx`) and the detail header (`src/app/jobs/[id]/page.tsx`), use `ScoreRing` for the match score (a smaller `size` is fine in dense rows, e.g. `size={36}`). Unscored rows render the muted "—" automatically.
- [ ] **Step 3:** `MatchBadge` (`src/components/indeed/match-badge.tsx`) may remain for any non-Scout consumer; only swap the Scout surfaces. Confirm `npx tsc --noEmit` clean.
- [ ] **Step 4: Verify live** — reload `/`, `/jobs`, a `/jobs/[id]`: rings render; unscored shows "—". Both themes.
- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(scout): score ring on cards, job rows, and detail"`

---

### Task 5: ActivityFeed consumes `groupActivity`

**Files:** `src/components/scout/activity-feed.tsx`.

- [ ] **Step 1:** Import `groupActivity` and render grouped output. Replace the entry-mapping block: build `const entries = logs ? groupActivity([...logs].reverse()) : null;` (logs come oldest-first from `/api/logs`; reverse to newest-first, then group). In the `<li>` render, append the count when `> 1`:

```tsx
<p className="text-foreground leading-snug">
  {activityCopy(entry.action, entry.details)}
  {entry.count > 1 && (
    <span className="ml-1 text-xs font-bold text-muted-foreground">· ×{entry.count}</span>
  )}
</p>
```

Use `entry.timestamp` for `relativeTime(...)`. The `detailsFor` helper is no longer needed (grouping already merged `job` into `details`) — remove it and pass `entry.details`.

- [ ] **Step 2: Verify live** — the feed on Home now shows rolled-up lines (e.g. "🔎 Started looking for jobs · ×6") instead of repeated identical rows. `npx tsc --noEmit` clean.
- [ ] **Step 3: Commit** — `git add src/components/scout/activity-feed.tsx && git commit -m "feat(scout): group repeated events in the activity feed"`

---

### Task 6: Home — three-zone command center (frontend-design)

Rewrite `src/app/page.tsx` from the current two-column layout into the three-zone command center (spec §3, layout **C**). This is the flagship visual task — own the polish, but honor these contracts exactly.

**Files:** `src/app/page.tsx`; `tests/e2e/dashboard.spec.ts`.

- [ ] **Step 1: Build the three zones.** Reuse ALL the existing data wiring already in `page.tsx` (the `refresh()` callback fetching `/api/queue`, `/api/jobs?status=needs_review`, `/api/jobs?stats=true`, the derived `foundToday`, `/api/sources`, `/api/indeed/scrape`, `/api/automation`) — do not add API routes. New structure:
  - **Zone 1 — hero strip:** greeting + four big `tabular-nums` stats (To review = `reviews.length + (queue?.length ?? 0)` or a "needs you" count; Applied today; Found today; Sources active) + a prominent **Run-a-sweep** button driving the discovery engine via `/api/indeed/scrape` (GET status → POST `{}` to start / POST `{action:"stop"}` to stop; mirror the StatusPill states: idle "▶ Run a sweep", running/stopping "● Working…", error "⚠ Check activity"; disable while the request is in flight). Keep the `LinkedInAutoApplyCard` (already in this file) as a small secondary control — move it into the hero as a compact button group or keep it in Zone 3.
  - **Zone 2 — "Needs you" row:** render `ReviewCard`s then `QueueCard`s (same components/props as today), laid out as the primary row. When empty, the first-run/sweeping states from Step 2.
  - **Zone 3 — split (`grid md:grid-cols-2`):** "Recently applied" (fetch the existing applied list — `/api/jobs?status=applied&limit=8` for LinkedIn ∪ the submitted discovered rows already available; render compact rows, newest first) | "Activity" (`<ActivityFeed />`, already grouped from Task 5).
- [ ] **Step 2: Empty / first-run / sweeping states** (spec §5): keep a `hasPicks` check. Empty + idle → warm first-run card with the Run button front-and-center ("Scout hasn't looked yet — run a sweep to fill your picks 🔎"); empty + `engineRunning` → "Scout's looking…" with a spinner; `queue === null` → the existing skeleton.
- [ ] **Step 3: Update `tests/e2e/dashboard.spec.ts`** to the new structure: assert the hero stats are present, the Run-a-sweep control exists, the "Needs you" region renders (cards or first-run prompt), and the Recently-applied + Activity zones exist. Keep assertions structural (don't assert specific counts — DiscoveredJob is empty in dev).
- [ ] **Step 4: Verify live** — reload `/`: three zones; with the empty DiscoveredJob you'll see the first-run prompt in Zone 2 and real numbers in the hero/applied/activity. Check light + dark. `npx tsc --noEmit` clean. Run `npx playwright test tests/e2e/dashboard.spec.ts` → green.
- [ ] **Step 5: Commit** — `git add src/app/page.tsx tests/e2e/dashboard.spec.ts && git commit -m "feat(scout): three-zone command-center Home with run control and first-run states"`

---

### Task 7: Final verification + merge + push

- [ ] **Step 1:** Regenerate Next types so the route validator drops the deleted onboarding page: `rm -rf .next/types && curl -s -o /dev/null http://localhost:3000/ && curl -s -o /dev/null http://localhost:3000/jobs && sleep 2`.
- [ ] **Step 2:** `npx tsc --noEmit` → clean.
- [ ] **Step 3:** `npx vitest run` → all green (205 baseline − onboarding.test + group-activity test).
- [ ] **Step 4:** `npx playwright test tests/e2e tests/automation` → green (onboarding.spec removed; dashboard.spec updated).
- [ ] **Step 5:** Live walkthrough: Home (empty + zones), Jobs tabs, a detail page, light + dark, and confirm `/onboarding` 404s and no page flashes "Loading…".
- [ ] **Step 6:** Merge to main, re-verify, push:

```bash
git checkout main && git merge --ff-only scout-ui-round2 && npx vitest run
git push origin main && git branch -d scout-ui-round2
```

---

## Self-review (plan author)

- **Spec coverage:** §2 onboarding removal → T1; §3 command-center Home → T6; §4 score-ring card → T3+T4; §5 empty/first-run → T6 step 2; §6 activity grouping → T2+T5; §8 testing → T2 (unit), T1/T6 (e2e), T7 (final). No gaps.
- **Type consistency:** `groupActivity`→`GroupedActivity{action,details,count,timestamp}` consumed by ActivityFeed (T5); `ScoreRing{score}` consumed in T4; existing `QueueJob`/`ReviewJob`/`refresh()` reused in T6 unchanged.
- **Placeholders:** T1/T2/T3/T5 are exact code; T4/T6 are deliberate frontend-design delegations (contracts + data wiring fully specified) per the header, not omissions.
