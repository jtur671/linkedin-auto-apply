# Scout Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. **Visual implementation note:** the user explicitly requested the `frontend-design` skill drive the UI work — page-rebuild tasks (5–9) specify structure/data/copy contracts precisely but intentionally leave pixel-level execution to that skill's standards (distinctive, polished, no generic-AI look). Token and shared-component tasks (1–4) are exact code and must be followed verbatim so parallel work can't visually drift.

**Goal:** Rebrand and restructure the app as **Scout** — friendly multi-source job machine: 4-item sidebar + status pill, hybrid Home (picks queue + activity), unified Jobs page, plain-English copy layer.

**Architecture:** Pure UI/IA layer over the existing engine — design tokens via Tailwind v4 CSS variables, restyled shadcn components, new shared Scout components, three small new APIs (sources, queue, dismiss), route moves with `next.config.ts` redirects. One additive schema column (`DiscoveredJob.dismissedAt`). No engine/applier/source changes.

**Tech Stack:** Next.js 16 (App Router), Tailwind v4 `@theme`, shadcn/base-ui, next-themes, Nunito via `next/font/google`, Prisma 7/SQLite, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-06-12-scout-redesign-design.md` (read it first — copy rules in §2 are requirements).

**Branch:** `scout-redesign` (already created). Suite baseline: 188 passing, tsc clean.

**Conventions:** vitest via `npx vitest run <file>`; Playwright via positional path (`npx playwright test tests/e2e/x.spec.ts` — `--testMatch` is not a CLI flag); never restart the user's dev server — verify over live HTTP; schema changes via `npm run db:push && npm run db:generate` (additive only here); AGENTS.md: this Next.js has breaking changes — check `node_modules/next/dist/docs/` if an API surprises you.

---

## File map

**Create:** `src/lib/ui/outcome-copy.ts` · `src/components/scout/status-pill.tsx` · `src/components/scout/source-chip.tsx` · `src/components/scout/queue-card.tsx` · `src/components/scout/activity-feed.tsx` · `src/components/scout/stat-chip.tsx` · `src/app/api/sources/route.ts` · `src/app/api/queue/route.ts` · `src/app/api/jobs/[id]/dismiss/route.ts` · `src/app/profile/page.tsx` · `src/app/settings/page.tsx` · `src/app/settings/logs/page.tsx` · `src/app/jobs/[id]/page.tsx` · tests for each.

**Modify:** `src/app/globals.css` (tokens) · `src/app/layout.tsx` (font/metadata/theme) · `src/components/sidebar.tsx` (rebuild) · `src/components/layout-shell.tsx` (bg wash) · `src/app/page.tsx` (Home rebuild) · `src/app/jobs/page.tsx` (tabs rebuild) · `src/app/onboarding/page.tsx` + `src/components/onboarding/*` (copy/style) · `next.config.ts` (redirects) · `prisma/schema.prisma` (+dismissedAt) · `tests/e2e/*.spec.ts`.

**Delete (Task 10, after redirects):** `src/app/indeed/` pages, `src/app/seo/page.tsx`, `src/app/config/page.tsx`, `src/app/review/page.tsx`, `src/app/logs/page.tsx` (their components are reused/moved, not deleted blindly — see Task 10).

---

### Task 1: Scout design tokens, font, light-first theme, brand metadata

**Files:** Modify `src/app/globals.css`, `src/app/layout.tsx`, `src/components/layout-shell.tsx`.

- [ ] **Step 1: Replace the `:root` and `.dark` variable blocks in `globals.css`** (keep the `@theme inline` block and everything else as-is; only swap the variable values). Scout light is the default:

```css
:root {
  /* Scout light — emerald/teal on warm mint-white. Hex refs in comments. */
  --background: oklch(0.991 0.008 160);          /* near-white mint wash (#fafdfb) */
  --foreground: oklch(0.39 0.062 188);            /* deep teal ink #134e4a */
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.39 0.062 188);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.39 0.062 188);
  --primary: oklch(0.696 0.17 162);               /* emerald #10b981 */
  --primary-foreground: oklch(1 0 0);
  --secondary: oklch(0.953 0.051 180);            /* light teal #ccfbf1 */
  --secondary-foreground: oklch(0.511 0.096 186); /* teal #0d9488 */
  --muted: oklch(0.984 0.014 180);                /* #f0fdfa */
  --muted-foreground: oklch(0.554 0.046 257);     /* slate-500 */
  --accent: oklch(0.984 0.019 200);               /* cyan-50 #ecfeff */
  --accent-foreground: oklch(0.511 0.096 186);
  --destructive: oklch(0.637 0.237 25.3);         /* rose-500 */
  --border: oklch(0.95 0.026 180);                /* #d1fae5-ish */
  --input: oklch(0.95 0.026 180);
  --ring: oklch(0.696 0.17 162);
  --chart-1: oklch(0.696 0.17 162);
  --chart-2: oklch(0.715 0.143 215);              /* cyan #06b6d4 */
  --chart-3: oklch(0.511 0.096 186);
  --chart-4: oklch(0.852 0.199 91.9);             /* amber-300 */
  --chart-5: oklch(0.39 0.062 188);
  --radius: 1rem;                                 /* Scout is round */
  --sidebar: oklch(1 0 0);
  --sidebar-foreground: oklch(0.39 0.062 188);
  --sidebar-primary: oklch(0.696 0.17 162);
  --sidebar-primary-foreground: oklch(1 0 0);
  --sidebar-accent: oklch(0.984 0.014 180);
  --sidebar-accent-foreground: oklch(0.511 0.096 186);
  --sidebar-border: oklch(0.95 0.026 180);
  --sidebar-ring: oklch(0.696 0.17 162);
}

.dark {
  /* Scout dark — deep teal-charcoal, same accents. */
  --background: oklch(0.19 0.018 195);            /* #0f1b1a-family */
  --foreground: oklch(0.96 0.012 180);
  --card: oklch(0.235 0.02 195);
  --card-foreground: oklch(0.96 0.012 180);
  --popover: oklch(0.235 0.02 195);
  --popover-foreground: oklch(0.96 0.012 180);
  --primary: oklch(0.696 0.17 162);
  --primary-foreground: oklch(0.19 0.018 195);
  --secondary: oklch(0.3 0.03 190);
  --secondary-foreground: oklch(0.84 0.09 182);
  --muted: oklch(0.27 0.022 192);
  --muted-foreground: oklch(0.71 0.03 190);
  --accent: oklch(0.3 0.04 200);
  --accent-foreground: oklch(0.84 0.09 182);
  --destructive: oklch(0.637 0.237 25.3);
  --border: oklch(0.31 0.025 192);
  --input: oklch(0.31 0.025 192);
  --ring: oklch(0.696 0.17 162);
  --chart-1: oklch(0.696 0.17 162);
  --chart-2: oklch(0.715 0.143 215);
  --chart-3: oklch(0.84 0.09 182);
  --chart-4: oklch(0.852 0.199 91.9);
  --chart-5: oklch(0.96 0.012 180);
  --sidebar: oklch(0.235 0.02 195);
  --sidebar-foreground: oklch(0.96 0.012 180);
  --sidebar-primary: oklch(0.696 0.17 162);
  --sidebar-primary-foreground: oklch(0.19 0.018 195);
  --sidebar-accent: oklch(0.27 0.022 192);
  --sidebar-accent-foreground: oklch(0.84 0.09 182);
  --sidebar-border: oklch(0.31 0.025 192);
  --sidebar-ring: oklch(0.696 0.17 162);
}
```

Also append a soft-shadow utility used by Scout cards:

```css
@layer utilities {
  .shadow-scout {
    box-shadow: 0 2px 8px oklch(0.511 0.096 186 / 0.08), 0 1px 2px oklch(0.511 0.096 186 / 0.05);
  }
}
```

- [ ] **Step 2: Rewrite `src/app/layout.tsx`** — Nunito, Scout metadata, light-first with next-themes:

```tsx
import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";
import { LayoutShell } from "@/components/layout-shell";

const nunito = Nunito({ subsets: ["latin"], weight: ["400", "600", "700", "800"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Scout — your job search, handled",
  description: "Scout finds jobs across the web, scores them against your resume, and applies for you.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${nunito.variable} ${nunito.className}`}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <LayoutShell>{children}</LayoutShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
```

(Removes the hardcoded `className="dark"` — Scout is light-first; `.dark` remains available via next-themes for the Settings toggle in Task 8.)

- [ ] **Step 3:** In `src/components/layout-shell.tsx`, give `<main>` the Scout wash: `className="flex-1 overflow-auto p-6 bg-gradient-to-br from-background to-accent/40"` (adjust against the live page; keep the existing loading/auth logic untouched).

- [ ] **Step 4: Verify** — `npx tsc --noEmit` clean; load `http://localhost:3000` and confirm light Scout palette + Nunito render (dev server is running; just reload).

- [ ] **Step 5: Commit** — `git add -A src/app/globals.css src/app/layout.tsx src/components/layout-shell.tsx && git commit -m "feat(scout): design tokens, Nunito, light-first theme, brand metadata"`

---

### Task 2: Plain-English copy layer (`outcome-copy.ts`)

**Files:** Create `src/lib/ui/outcome-copy.ts`, `tests/unit/ui/outcome-copy.test.ts`.

- [ ] **Step 1: Failing test**

```ts
// tests/unit/ui/outcome-copy.test.ts
import { describe, it, expect } from "vitest";
import { outcomeCopy, activityCopy } from "@/lib/ui/outcome-copy";

describe("outcomeCopy", () => {
  it("maps apply outcomes to Scout copy", () => {
    expect(outcomeCopy("submitted")).toBe("Applied 🎉");
    expect(outcomeCopy("needs_review")).toBe("Your call");
    expect(outcomeCopy("failed")).toBe("Didn't go through");
    expect(outcomeCopy("skipped")).toBe("Passed");
  });
  it("falls back gracefully", () => {
    expect(outcomeCopy(null)).toBe("Found");
    expect(outcomeCopy(undefined)).toBe("Found");
    expect(outcomeCopy("weird_state")).toBe("Weird state");
  });
});

describe("activityCopy", () => {
  it("maps known log actions to sentences", () => {
    expect(activityCopy("indeed_start")).toBe("🔎 Started looking for jobs");
    expect(activityCopy("indeed_stop")).toBe("✅ Finished a search sweep");
    expect(activityCopy("indeed_error")).toBe("⚠️ Hit a snag while searching");
    expect(activityCopy("apply_success", { company: "Figma" })).toBe("🎉 Applied to Figma");
  });
  it("humanizes unknown actions", () => {
    expect(activityCopy("session_refresh")).toBe("Session refresh");
  });
});
```

- [ ] **Step 2:** Run `npx vitest run tests/unit/ui/outcome-copy.test.ts` → FAIL (module not found).

- [ ] **Step 3: Implement.** Before writing the map, enumerate every real action: `grep -rn "action:" src/lib/logging src/lib/automation src/lib --include='*.ts' | grep -oE '"[a-z_]+"' | sort -u`. Cover each in `ACTIVITY_MAP`; the test's four are the minimum. Shape:

```ts
// src/lib/ui/outcome-copy.ts
const OUTCOME_MAP: Record<string, string> = {
  submitted: "Applied 🎉",
  needs_review: "Your call",
  failed: "Didn't go through",
  skipped: "Passed",
};

export function outcomeCopy(outcome: string | null | undefined): string {
  if (!outcome) return "Found";
  return OUTCOME_MAP[outcome] ?? humanize(outcome);
}

const ACTIVITY_MAP: Record<string, string | ((d: Record<string, unknown>) => string)> = {
  indeed_start: "🔎 Started looking for jobs",
  indeed_stop: "✅ Finished a search sweep",
  indeed_error: "⚠️ Hit a snag while searching",
  apply_success: (d) => `🎉 Applied to ${d.company ?? "a job"}`,
  // …extend with every action the grep found (apply_skip, login, etc.)
};

export function activityCopy(action: string, details: Record<string, unknown> = {}): string {
  const entry = ACTIVITY_MAP[action];
  if (typeof entry === "function") return entry(details);
  if (entry) return entry;
  return humanize(action);
}

function humanize(s: string): string {
  const words = s.replace(/_/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}
```

- [ ] **Step 4:** Run the test → PASS. `npx tsc --noEmit` clean.
- [ ] **Step 5: Commit** — `git commit -m "feat(scout): plain-English outcome and activity copy layer"` (add both files).

---

### Task 3: Scout data APIs — sources, queue, dismiss (+ `dismissedAt` column)

**Files:** Modify `prisma/schema.prisma`; create `src/app/api/sources/route.ts`, `src/app/api/queue/route.ts`, `src/app/api/jobs/[id]/dismiss/route.ts`, `tests/integration/api/scout-apis.test.ts`.

- [ ] **Step 1: Schema** — add to `model DiscoveredJob`: `dismissedAt DateTime?`. Run `npm run db:push && npm run db:generate` (additive; no `--accept-data-loss` needed — if Prisma asks for it, STOP, something is wrong).

- [ ] **Step 2: Failing tests**

```ts
// tests/integration/api/scout-apis.test.ts
import { describe, it, expect } from "vitest";
import { prisma } from "@/lib/db";
import { GET as getSources } from "@/app/api/sources/route";
import { GET as getQueue } from "@/app/api/queue/route";
import { POST as dismiss } from "@/app/api/jobs/[id]/dismiss/route";

const ctx = (id: number) => ({ params: Promise.resolve({ id: String(id) }) });
const seed = (over: Record<string, unknown> = {}) =>
  prisma.discoveredJob.create({
    data: {
      source: "remotive", externalId: String(Math.random()), title: "QA", company: "Acme",
      location: "Remote", url: "https://x/1", applyUrl: "https://boards.greenhouse.io/a/jobs/1",
      descriptionRaw: "d", searchQuery: "qa", ...over,
    },
  });

describe("GET /api/sources", () => {
  it("lists registered sources with configured flags", async () => {
    const res = await getSources();
    const body = await res.json();
    expect(body.sources.length).toBeGreaterThanOrEqual(6);
    const ids = body.sources.map((s: { id: string }) => s.id);
    expect(ids).toEqual(expect.arrayContaining(["adzuna", "remotive", "hiringcafe"]));
    expect(typeof body.sources[0].configured).toBe("boolean");
  });
});

describe("GET /api/queue", () => {
  it("returns unapplied, undismissed jobs ordered by match score, with canAutoApply", async () => {
    await seed({ matchScore: 95 });
    await seed({ matchScore: 50, applyUrl: "https://example.com/x" });
    await seed({ matchScore: 99, applyOutcome: "submitted" }); // applied — excluded
    await seed({ matchScore: 98, dismissedAt: new Date() });   // passed — excluded
    const res = await getQueue();
    const body = await res.json();
    expect(body.jobs).toHaveLength(2);
    expect(body.jobs[0].matchScore).toBe(95);
    expect(body.jobs[0].canAutoApply).toBe(true);   // greenhouse applyUrl
    expect(body.jobs[1].canAutoApply).toBe(false);  // example.com
  });
});

describe("POST /api/jobs/[id]/dismiss", () => {
  it("stamps dismissedAt", async () => {
    const job = await seed({});
    const res = await dismiss(new Request("http://x", { method: "POST" }), ctx(job.id));
    expect(res.status).toBe(200);
    const updated = await prisma.discoveredJob.findUnique({ where: { id: job.id } });
    expect(updated?.dismissedAt).not.toBeNull();
  });
});
```

- [ ] **Step 3:** Run → FAIL (modules not found).

- [ ] **Step 4: Implement the three routes**

```ts
// src/app/api/sources/route.ts
import { NextResponse } from "next/server";
import { registeredSources } from "@/lib/sources/registry";

export async function GET() {
  const sources = registeredSources().map((s) => ({
    id: s.id, label: s.label, configured: s.isConfigured(),
  }));
  return NextResponse.json({ sources });
}
```

```ts
// src/app/api/queue/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { applierFor } from "@/lib/sources/registry";

const QUEUE_SIZE = 10;

export async function GET() {
  const rows = await prisma.discoveredJob.findMany({
    where: { applyOutcome: null, dismissedAt: null },
    orderBy: [{ matchScore: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
    take: QUEUE_SIZE,
  });
  const jobs = rows.map((row) => ({
    ...row,
    canAutoApply:
      applierFor({
        source: row.source, externalId: row.externalId, title: row.title, company: row.company,
        location: row.location, salary: row.salary, jobType: row.jobType, url: row.url,
        applyUrl: row.applyUrl, description: row.descriptionRaw,
      }) !== null,
  }));
  return NextResponse.json({ jobs });
}
```

```ts
// src/app/api/jobs/[id]/dismiss/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const jobId = parseInt(id);
  if (isNaN(jobId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  const row = await prisma.discoveredJob.findUnique({ where: { id: jobId } });
  if (!row) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  await prisma.discoveredJob.update({ where: { id: jobId }, data: { dismissedAt: new Date() } });
  return NextResponse.json({ ok: true });
}
```

(If Prisma 7 rejects the `nulls: "last"` orderBy form on SQLite, fall back to `orderBy: [{ matchScore: "desc" }, { createdAt: "desc" }]` and note it — unscored jobs sorting first is acceptable for M-now.)

- [ ] **Step 5:** Run the test file → PASS. Full `npx vitest run` → 188 + new all green. `npx tsc --noEmit` clean.
- [ ] **Step 6: Commit** — `git commit -m "feat(scout): sources/queue/dismiss APIs and dismissedAt column"`.

---

### Task 4: Sidebar shell — brand, 4 items, StatusPill

**Files:** Rewrite `src/components/sidebar.tsx`; create `src/components/scout/status-pill.tsx`.

- [ ] **Step 1: Read first:** `src/app/api/indeed/scrape/route.ts` (the start/stop/status contract for the discovery sweep) and `src/components/indeed/scrape-controls.tsx` (current polling pattern — reuse its approach).

- [ ] **Step 2: `StatusPill`** (client component): polls scrape status every 5s (match the existing dashboard poll cadence). States: idle → pill shows `▶ start` (emerald outline); running → `● working` (filled emerald, gentle pulse animation); error → `⚠ check activity` (amber). Click: idle→POST start, running→POST stop, using the scrape route's actual contract from Step 1. Pill is fully rounded (`rounded-full`), Nunito-bold, small.

- [ ] **Step 3: Rewrite `sidebar.tsx`:**

```tsx
const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/jobs", label: "Jobs", icon: Briefcase },
  { href: "/profile", label: "Profile", icon: UserRound },
  { href: "/settings", label: "Settings", icon: Settings },
];
```

Brand block: the Scout dot-mark (a `size-5 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500` div) + **Scout** wordmark (font-extrabold, ink color). Active item: `bg-primary text-primary-foreground rounded-xl`; inactive hover `bg-muted`. Home item shows a queue-count badge (fetch `/api/queue` count, small `rounded-full bg-primary/10 text-primary px-1.5 text-xs`). `StatusPill` pinned at the sidebar bottom. Active-state matching must be prefix-aware (`pathname === href || (href !== "/" && pathname.startsWith(href))`) so `/jobs/123` highlights Jobs.

- [ ] **Step 4: Verify live** — reload `localhost:3000`: brand, 4 items, pill render; pill reflects real engine state (idle unless a sweep runs). `npx tsc --noEmit` clean.
- [ ] **Step 5: Commit** — `git commit -m "feat(scout): sidebar shell with Scout brand and engine status pill"`.

---

### Task 5: Home — "Your picks today" + "While you were away"

**Files:** Rewrite `src/app/page.tsx`; create `src/components/scout/queue-card.tsx`, `src/components/scout/activity-feed.tsx`, `src/components/scout/stat-chip.tsx`, `src/components/scout/source-chip.tsx`.

- [ ] **Step 1: Read first:** current `src/app/page.tsx` (stats endpoints + LinkedIn automation start/stop it uses), `src/app/api/logs/route.ts` (log fetch shape), `src/app/review/page.tsx` (what review items look like — Home absorbs this surface), `src/components/indeed/match-badge.tsx` (reuse).

- [ ] **Step 2: Build the page.** Two-column grid (`lg:grid-cols-[1.2fr_1fr]`, stacks on small):
  - **Left — "Your picks today 🎯":** fetch `/api/queue`. Each `QueueCard`: title (bold ink), company · location, `SourceChip` (per-source label, subtle tinted pill — distinct hue per source id via a small lookup), `MatchBadge`, salary if present. Actions: **Go for it** (primary pill; if `canAutoApply` → POST `/api/jobs/{id}/apply`, replace buttons inline with plain-English outcome via `outcomeCopy`; else `window.open(applyUrl ?? url)`) and **Pass** (ghost pill → POST dismiss → card animates out). Empty state: "No picks yet — Scout's still looking 🔎" (+ idle variant: "Scout's resting — press start").
  - **Right — "While you were away":** `ActivityFeed` polling the logs API (5s), rendering `activityCopy(action, details)` lines with relative timestamps (date-fns `formatDistanceToNow`); above it a row of `StatChip`s: Applied today / This week / Found today / Sources active (computed from existing stats endpoints + `/api/sources` configured count). Below: the **LinkedIn auto-apply card** — preserves the old dashboard's start/stop for the LinkedIn Easy Apply engine (this is NOT the status pill's sweep; label it plainly: "LinkedIn auto-apply").
  - Review-needed LinkedIn jobs (old `/review` data) appear at the top of the queue column as "Your call" cards linking to their detail/screenshot — read the review page's data source in Step 1 and fold it in.

- [ ] **Step 3: Verify live** — with the dev DB's real data: queue renders discovered jobs by score; activity shows the M2 sweep history in plain English; chips show real counts. Both themes. `npx tsc --noEmit` clean.
- [ ] **Step 4: Commit** — `git commit -m "feat(scout): hybrid Home with picks queue and friendly activity"`.

---

### Task 6: Jobs — one list, three tabs (+ detail at `/jobs/[id]`)

**Files:** Rewrite `src/app/jobs/page.tsx`; create `src/app/jobs/[id]/page.tsx` (move + restyle from `src/app/indeed/[id]/page.tsx`); reuse/restyle `src/components/indeed/indeed-job-table.tsx` → `src/components/scout/job-table.tsx`.

- [ ] **Step 1: Read first:** `src/app/indeed/page.tsx` + `indeed-job-table.tsx` (current list), old `src/app/jobs/page.tsx` (LinkedIn applied list + its API), `src/app/api/indeed/insights/route.ts` (stat data), `src/app/indeed/[id]/page.tsx` (detail page — Auto-Apply button behavior must be preserved exactly, including the post-submit hide).
- [ ] **Step 2: Tabs via `?tab=` param** (`found` default | `applied` | `passed`):
  - **Found:** DiscoveredJob where `applyOutcome: null, dismissedAt: null` — sortable by score/date, filter chips by source (from `/api/sources`), search box. Row → `/jobs/[id]`.
  - **Applied:** union of DiscoveredJob `applyOutcome: "submitted"` (with `outcomeCopy` status) and the LinkedIn `Job` table rows (existing API), one merged list sorted by date, each row tagged with its origin chip (LinkedIn chip vs source chip).
  - **Passed:** DiscoveredJob `dismissedAt != null` + the review page's dismissed LinkedIn rows if that mechanism exists (verified in Task 5 reading); offer "Restore" (clears `dismissedAt` — add `DELETE` handler to the dismiss route: sets `dismissedAt: null`).
  - Stat chips strip above tabs (absorbs Insights): counts per source, top requirements summary if cheaply available from the insights API.
- [ ] **Step 3: Detail page** at `/jobs/[id]`: move the indeed detail page, restyle to Scout (cards, pills, plain-English outcome), keep `canAutoApply`/Auto-Apply/`sonner` behavior identical (it calls the same `/api/indeed/[id]` + `/api/jobs/[id]/apply` routes — API paths unchanged).
- [ ] **Step 4: Verify live** (all three tabs with real data, detail page apply button still gated) · `npx tsc --noEmit`.
- [ ] **Step 5: Commit** — `git commit -m "feat(scout): unified Jobs page with Found/Applied/Passed tabs"`.

---

### Task 7: Profile (move `/seo`)

**Files:** Create `src/app/profile/page.tsx` from `src/app/seo/page.tsx`; restyle `src/components/seo/*` in place.

- [ ] Move the SEO page content to `/profile`, retitle ("Profile" / "Make recruiters find you"), Scout-style the audit cards and rewrite flows, keep all behavior + API calls identical. Verify live; tsc clean; commit `feat(scout): Profile page (moved from /seo)`.

---

### Task 8: Settings (move `/config`) + raw logs + theme toggle

**Files:** Create `src/app/settings/page.tsx` from `src/app/config/page.tsx`, `src/app/settings/logs/page.tsx` from `src/app/logs/page.tsx`.

- [ ] Move config page to `/settings`: Scout-styled section cards (Credentials, Search configs, Answers, AI provider, Resume), a "Re-run setup" link to `/onboarding`, a **theme toggle** (light/dark via next-themes `useTheme`), and a quiet "Raw activity log" link to `/settings/logs` (the old logs page, restyled minimally — it's the debug view; keep the log table component). Behavior/APIs unchanged. Verify live; tsc clean; commit `feat(scout): Settings with raw logs and theme toggle`.

---

### Task 9: Onboarding rebrand

**Files:** Modify `src/app/onboarding/page.tsx` + `src/components/onboarding/*`.

- [ ] Same 4 steps, Scout voice and styling: intro becomes "Hi, I'm Scout 👋 — let's set up your search," step labels in plain English, finish screen points at the Home queue ("I'll start finding your picks"). No flow/API changes. Verify live (visit `/onboarding`); commit `feat(scout): onboarding rebrand`.

---

### Task 10: Redirects + retire old routes

**Files:** Modify `next.config.ts`; delete `src/app/indeed/` (pages only — `src/components/indeed/*` stays where still imported), `src/app/seo/`, `src/app/config/`, `src/app/review/`, `src/app/logs/`.

- [ ] **Step 1:** Add to `next.config.ts`:

```ts
async redirects() {
  return [
    { source: "/indeed", destination: "/jobs?tab=found", permanent: false },
    { source: "/indeed/insights", destination: "/jobs", permanent: false },
    { source: "/indeed/:id(\\d+)", destination: "/jobs/:id", permanent: false },
    { source: "/seo", destination: "/profile", permanent: false },
    { source: "/config", destination: "/settings", permanent: false },
    { source: "/review", destination: "/?focus=queue", permanent: false },
    { source: "/logs", destination: "/settings/logs", permanent: false },
  ];
},
```

- [ ] **Step 2:** Delete the old page directories ONLY after confirming each surface was absorbed (grep each deleted page's component imports — components still used by new pages must not be deleted). `/api/indeed/*` routes stay.
- [ ] **Step 3:** Verify every old URL redirects on the live server (`curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" http://localhost:3000/indeed` etc. — expect 307/308 + correct target). `npm run build` succeeds (catches dead imports). Commit `feat(scout): redirect legacy routes, retire old pages`.

---

### Task 11: e2e updates

**Files:** Modify `tests/e2e/dashboard.spec.ts`, `job-list.spec.ts`, `log-viewer.spec.ts`, `configuration.spec.ts`, `onboarding.spec.ts`, `automation-control.spec.ts`.

- [ ] Update routes/labels/selectors to Scout (Home queue/activity selectors, `/jobs` tabs, `/settings` forms, sidebar items, status pill). Add one redirect assertion per moved route. Run `npx playwright test tests/e2e` until green (existing dev server is reused). Commit `test(scout): update e2e suite for Scout IA`.

---

### Task 12: Final verification

- [ ] `npx vitest run` — everything green (188 baseline + outcome-copy + scout-apis).
- [ ] `npx tsc --noEmit` clean; `npx eslint src/components/scout src/lib/ui src/app --max-warnings=99` introduces no NEW errors vs baseline.
- [ ] `npx playwright test tests/e2e tests/automation` — all green.
- [ ] Live walkthrough: every page, light + dark, empty-DB states spot-checked (rename `prisma/dev.db` is NOT allowed — instead verify empty states by filtering, or visually confirm copy exists in code).
- [ ] Merge `scout-redesign` → main (ff), full suite on main, **push** (standing instruction).

---

## Self-review (plan author)

- **Spec coverage:** §2 identity → T1/T2/T9 + headings in T5–T8; §3 system → T1; §4 IA/pill/redirects → T4/T10 (pill = discovery sweep ✓, LinkedIn card on Home ✓ T5); §5 pages → T5–T8; §6 components/dismiss → T3/T5; §7 states → embedded in T5–T8 requirements; §8 testing → T2/T3/T11/T12. No gaps.
- **Type consistency:** queue API returns `canAutoApply` consumed by `QueueCard`; dismiss route POST/DELETE used by Pass/Restore; `outcomeCopy`/`activityCopy` names match across T2/T5/T6.
- **Placeholders:** Tasks 5–9 intentionally specify contracts + read-lists rather than full page code — that is the explicit frontend-design delegation declared in the header, not an omission. The exact-code tasks (1–4, 10) are complete.
