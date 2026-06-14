# Scout UI Round 2 — Command-Center Home, Onboarding Removal, Card & Activity Polish

**Date:** 2026-06-14
**Status:** Approved design, pre-implementation
**Builds on:** the Scout redesign (`2026-06-12-scout-redesign-design.md`) and the personal-only POV ([[project_personal_pov]] — single user, no distribution/onboarding-for-strangers).

## 1. Why

Scout is now a personal daily driver. Two things don't fit that: (a) the onboarding wizard is ceremony for a user who's already configured, and its first-run gate adds a "Loading…" flash to every navigation; (b) Home reads like a generic dashboard rather than "do the next thing toward a job." This round removes the ceremony and reworks the daily surfaces (Home + the job card) around action, with proper empty/first-run states and a scannable activity feed.

Brainstorm decisions (user-selected): remove onboarding · Home layout **C (three-zone command center)** · job card **A (score ring)** · plus first-run/empty states and activity-feed grouping.

## 2. Remove onboarding

**Delete:** `src/app/onboarding/`, `src/components/onboarding/`, `src/app/api/onboarding/` (the status route), `src/lib/onboarding.ts`, `tests/unit/onboarding.test.ts`, `tests/e2e/onboarding.spec.ts`.

**`src/components/layout-shell.tsx`** — remove the onboarding gate entirely: the `/api/onboarding/status` fetch, the `router.push("/onboarding")` redirect, the `checking`/"Loading…" blocking state, and the `pathname === "/onboarding"` full-width special-case. Result: the shell renders sidebar + main immediately on every load (kills the per-navigation flash).

**`src/app/settings/page.tsx`** — remove the "Re-run setup" link to `/onboarding`. Settings already holds every field onboarding collected (credentials, searches, answers, AI, resume); it is the configuration surface.

**Safety/POV note:** a brand-new install with an empty DB will no longer be walked through setup — acceptable and intended: this is a single-user personal tool with no new installs; (re)configuration lives in Settings. No `/onboarding` redirect is added to `next.config.ts` (the route simply ceases to exist; nothing links to it after the Settings link is removed).

## 3. Home — three-zone command center

Rewrite `src/app/page.tsx` into three stacked zones (client page; reuses existing data endpoints, no new engine work):

- **Zone 1 — Hero strip:** a greeting + four big stats with `tabular-nums` — **to review · applied today · found today · sources active** — and a prominent **Run-a-sweep** control for the discovery engine (start/stop via the existing `/api/indeed/scrape` contract; same logic as the sidebar `StatusPill`, surfaced here as a labeled button: "▶ Run a sweep" / "● Working…" / error). The LinkedIn Easy-Apply engine keeps a small secondary start/stop control (in the hero or Zone 3), plainly labeled — it is a separate engine from the discovery sweep.
- **Zone 2 — "Needs you" row:** the action queue — needs-review LinkedIn jobs (`/api/jobs?status=needs_review`) + top-scored unapplied discovered picks (`/api/queue`) — rendered as score-ring `JobCard`s with **Go for it** / **Pass**. Horizontal/grid row; the highest-priority surface.
- **Zone 3 — split:** **Recently applied** (recent `submitted` discovered jobs ∪ recent applied LinkedIn `Job`s) | **Activity** (grouped feed, §5).

Stat sources are the existing endpoints already wired in the current Home (`/api/jobs?stats=true`, `/api/sources`, the discovered-list count). No new API routes.

## 4. Job card — score ring (shared component)

A single shared card — `src/components/scout/job-card.tsx` (consolidating today's `queue-card.tsx`; keep `ReviewCard` for the needs-review variant or fold it in) — used on Home's "Needs you" row, every Jobs-list row, and as the detail-page score header.

- **Score ring:** circular conic-gradient ring showing match %; emerald fill. **Unscored jobs show a muted "—" / "not scored"** (no ring fill), never a fake 0%.
- Content: title, company · location, `SourceChip`, salary (when present), match ring, actions (Go for it / Pass) where the surface supports actions; Jobs-list rows link to `/jobs/[id]`.
- The detail page (`/jobs/[id]`) shows the same ring for its score; existing Auto-Apply behavior unchanged.

## 5. Empty / first-run states

The dev DB has 0 DiscoveredJob rows until a sweep runs, so empty must be a designed state, not a blank:

- **Home, no picks + engine idle:** hero stats show `0`/`—`; "Needs you" becomes a warm first-run card — *"Scout hasn't looked yet — run a sweep to fill your picks 🔎"* with the Run button front and center.
- **Home, sweeping:** "Needs you" shows a "Scout's looking…" spinner state (driven by the scrape status `running`).
- **Jobs tabs:** Found empty → "Nothing waiting yet — run a sweep"; Applied empty → "No applications yet"; Passed empty → "Nothing set aside."
- All copy in Scout voice via the existing `outcome-copy` style.

## 6. Activity feed grouping

A pure `groupActivity(entries)` helper (new, e.g. `src/lib/ui/group-activity.ts`, unit-tested) collapses **consecutive** entries with the same humanized action into one line: a representative sentence + a `×N` count + the most-recent timestamp (e.g. `🔎 Searched for jobs · ×6`, or a per-sweep rollup `✅ Swept 6 sources · found 14`). The `ActivityFeed` renders grouped output. Raw, ungrouped logs remain verbatim at `/settings/logs` for debugging.

## 7. Components touched / created

- **Create:** `src/components/scout/job-card.tsx` (score-ring shared card), `src/lib/ui/group-activity.ts`.
- **Rewrite:** `src/app/page.tsx` (zones), `src/components/layout-shell.tsx` (gate removal), `src/components/scout/activity-feed.tsx` (consume grouping).
- **Update:** `src/app/jobs/page.tsx` + `src/app/jobs/[id]/page.tsx` (use the shared `JobCard`/ring), `src/app/settings/page.tsx` (drop re-run link). Retire `queue-card.tsx` if fully replaced.
- **Delete:** the onboarding files in §2.

## 8. Testing

- **Unit:** `groupActivity()` (consecutive same-action collapse, count, latest timestamp, non-adjacent not merged); any extracted empty-state/score-ring pure helpers.
- **e2e:** delete `onboarding.spec`; update the Home spec for the three-zone layout + first-run prompt + Run control; confirm no app path still references `/onboarding`; the layout no longer redirects, so update any spec asserting that.
- **Regression:** full vitest + tsc + the rest of the e2e/automation suites stay green; no engine/source/applier/API behavior changes (this is UI + deletion + one pure helper).
- **Visual:** dev-server walkthrough (Home empty + populated, both themes; Jobs tabs; detail) per verification discipline (live HTTP, no restarts).

## 9. Decisions locked

1. Onboarding fully removed; the first-run gate (and its page-load flash) goes with it.
2. Home = three-zone command center (C).
3. One shared score-ring job card (A); unscored → muted "—".
4. Designed empty/first-run + sweeping states everywhere data can be absent.
5. Activity feed grouped via a tested pure helper; raw logs preserved at `/settings/logs`.
6. Built with the frontend-design skill; no engine changes.
