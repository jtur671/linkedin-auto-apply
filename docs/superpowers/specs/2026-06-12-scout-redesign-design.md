# Scout — Full Product Redesign

**Date:** 2026-06-12
**Status:** Approved design, pre-implementation
**Scope:** UI/identity reframe of the app. No engine/applier/source behavior changes.

## 1. Why

The product outgrew its UI. It started as "LinkedIn Auto Apply" and is now a multi-source machine: 6 discovery sources, AI match scoring, registry-routed auto-apply (Greenhouse API, Lever browser, Ashby queued), with a tiered hands-off engine (M3) and recruiter outreach (M4) on the roadmap. The current UI still reads as its history: LinkedIn-centric dashboard, a sidebar of 8 bolted-on items ("Adzuna Jobs", "Applied Jobs", "Needs Review"), raw logs, jargon outcomes.

Decisions made during brainstorm (user-selected): **full reframe** (name + structure + visuals) · **hybrid home** (action queue + live activity) · **brand direction C "Scout"** (friendly consumer) · **nav chrome A** (friendly sidebar).

## 2. Identity

- **Name:** Scout. Voice: a helpful friend doing your job search — "Scout found you 14 jobs today."
- **Copy rules (load-bearing, not decoration):**
  - Outcomes in plain English: `needs_review` → "Your call", `submitted` → "Applied 🎉", `failed` → "Didn't go through", `skipped` → "Passed".
  - Activity feed entries are human sentences ("🎉 Applied to Figma", "🔎 Found 14 new jobs"), never raw log lines.
  - Empty states are warm: "Scout's resting — press start."
  - Buttons: "Go for it" / "Pass" (queue), "Start" / "Stop" via the status pill.
- **Rebranded surfaces:** root layout `metadata` (title/description), sidebar brand block, onboarding wizard copy, page headings.
- **Out of scope:** README and GitHub Pages landing rebrand (separate pass after the app ships); repo/package rename.

## 3. Design system

Tailwind v4 theme via CSS variables in `src/app/globals.css` (restyle the existing shadcn/base-ui components through tokens — do not replace components):

- **Palette (light):** primary emerald `#10b981`, deep teal `#0d9488`, accent cyan `#06b6d4`, ink `#134e4a`, background wash `#f0fdf4` (subtle gradient toward `#ecfeff`), card `#ffffff`, muted text slate.
- **Dark variant (next-themes stays):** deep teal-charcoal surfaces (`#0f1b1a`-family), same emerald/cyan accents, off-white ink.
- **Type:** Nunito via `next/font/google` (weights 400/600/700/800), applied at the root layout; numbers/stats may use tabular-nums.
- **Shape:** rounded-2xl cards, pill (fully-rounded) buttons and badges, soft teal-tinted shadows (`0 2px 8px rgba(13,148,136,.08)`).
- **Signature elements:** Scout dot-mark (emerald→cyan gradient circle) as the logo; source chips (per-source label on every job card); match-score badge; the status pill.

## 4. Structure (IA)

**Sidebar (4 items + pill):**

| Item | Route | Replaces |
|---|---|---|
| 🏠 Home (badge = queue count) | `/` | Dashboard + Needs Review + Logs |
| 💼 Jobs | `/jobs` | "Adzuna Jobs" (`/indeed`) + "Applied Jobs" (old `/jobs`) + Job Insights |
| 👤 Profile | `/profile` | Profile SEO (`/seo`) |
| ⚙️ Settings | `/settings` | Configuration (`/config`) + onboarding entry |
| ● status pill | (control) | Start button + automation controls |

- **Status pill:** persistent in the sidebar; shows "● working" (animated) / "start"; click toggles the **discovery sweep** (the multi-source scrape + scoring engine via the existing `/api/indeed/scrape` controls). The separate LinkedIn Easy Apply automation keeps its own start/stop as a card on Home (M3 unifies the two engines; the pill is the eventual single control). Visible on every page.
- **Route moves with redirects:** `/indeed` → `/jobs?tab=found`, `/indeed/[id]` → `/jobs/[id]`, `/indeed/insights` → `/jobs`, `/seo` → `/profile`, `/config` → `/settings`, `/review` → `/?focus=queue`, `/logs` → `/settings/logs`. Old URLs never 404. API routes under `/api/indeed/*` keep their paths (UI-internal; renaming them is gratuitous churn).
- **Raw logs** remain reachable at `/settings/logs` (debug view, current log table restyled); Home's activity feed is the friendly default.
- **Future slots:** sidebar accommodates "Outreach" (M4) without redesign; Home's queue is the surface M3's tiered auto-submit feeds.

## 5. Pages

### Home `/` — the hybrid split
- **Left — "Your picks today 🎯" (the queue):** top unapplied discovered jobs ordered by match score, plus anything explicitly needing review. Card: title, company, source chip, match %, salary, location. Actions: **Go for it** (if `canAutoApply` → POST the existing apply route, show outcome inline in plain English; else open listing in new tab) and **Pass** (dismiss → Passed).
- **Right — "While you were away":** friendly activity feed derived from `AutomationLog` (mapped action→sentence, recent N, polling like today's dashboard) + counter chips: applied today / this week / found today / sources active (`registeredSources().filter(isConfigured).length` exposed via a small API).
- Empty/idle states per copy rules; if no credential or no search config, Home shows a setup nudge linking to Settings.

### Jobs `/jobs` — one list, three tabs
- Tabs: **Found** (DiscoveredJob, unapplied, sortable by score/date, filterable by source), **Applied** (union: DiscoveredJob with `applyOutcome="submitted"` + the LinkedIn `Job` table), **Passed** (dismissed). Tab via `?tab=` param.
- Stat chips above the list absorb the old Insights page (top requirements/skills summary, counts by source).
- `/jobs/[id]` detail: restyled current detail (requirements, match summary, description) with Auto-Apply per current guarded behavior.

### Profile `/profile`
- The current SEO audit/rewrite page restyled into Scout cards and copy. Functionality unchanged.

### Settings `/settings`
- Current Configuration sections (credentials, search configs, profile answers, AI provider, resume) restyled; entry point to re-run the onboarding wizard; link to `/settings/logs`.
- Onboarding wizard itself: rebranded copy + Scout styling, same 4 steps.

## 6. Implementation approach

- Fresh branch `scout-redesign`. **frontend-design skill** (user-requested) drives the visual implementation.
- Order: design tokens + font + sidebar shell first (the chrome), then Home, Jobs, detail, Profile/Settings, redirects, e2e updates.
- Components stay shadcn/base-ui; new shared pieces: `SourceChip`, `MatchBadge` (restyle existing), `StatusPill`, `ActivityFeed`, `QueueCard`, `StatChip`, `outcome-copy.ts` (the plain-English mapping, unit-testable).
- "Pass/dismiss" persistence: LinkedIn `Job` rows already have the review-page dismiss; `DiscoveredJob` does not — add `dismissedAt DateTime?` to `DiscoveredJob` (single additive `db push`, no rename, no data risk) and a small dismiss API. The Passed tab unions both.

## 7. Error handling & states

- Every page has explicit empty, loading (skeleton cards), and error states in Scout voice.
- Apply failures surface the plain-English outcome inline on the card with a "see details" affordance (raw message in a tooltip/collapse — honesty preserved, jargon hidden by default).
- The status pill reflects engine errors ("something went wrong — see activity").

## 8. Testing

- **Unchanged:** all 188 unit/integration tests must stay green (no engine/source/applier changes). `outcome-copy.ts` gets a small unit test.
- **Updated:** the 6 Playwright e2e specs (`dashboard`, `job-list`, `log-viewer`, `configuration`, `onboarding`, `automation-control`) update to new routes/labels/selectors; redirect coverage added (old URL → new URL).
- **Visual verification:** dev-server walkthrough of all pages, light + dark, per the verification discipline (live HTTP, no restarts).

## 9. Decisions locked

1. Full reframe; name **Scout**; direction C visuals; sidebar chrome (option A).
2. Hybrid home: queue ("Your picks today") + activity ("While you were away").
3. 8 nav items → 4 + status pill; old routes 301 to new ones; API paths unchanged.
4. Plain-English copy layer is part of the product, implemented as a testable mapping.
5. README/landing rebrand deferred to a follow-up pass.
