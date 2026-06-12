# M1 — Source-Adapter Contract + Greenhouse Apply

**Date:** 2026-06-12
**Status:** Approved design, pre-implementation
**Scope:** First milestone (M1) of the multi-source auto-apply roadmap.

---

## 1. Roadmap context

The product goal: **find jobs across many sites and auto-apply, hands-off and fast, using an API for both search and apply wherever one exists — browser only where it doesn't.** The source universe is meant to keep expanding (LinkedIn, Indeed, Greenhouse, Hiring Cafe, and other remote boards).

This spec covers **only M1**, the foundation. Later milestones each get their own spec:

| Milestone | What | Status |
|-----------|------|--------|
| **M0** | LinkedIn Easy Apply (browser) · Adzuna discovery (API) · SEO · dashboard | Done |
| **M1** | Source-adapter **contract** + **Greenhouse** apply end-to-end | **This spec** |
| M2 | Breadth: adapters for Hiring Cafe, Remotive, RemoteOK, Himalayas, Lever, Ashby, USAJOBS | Later |
| M3 | Hands-off engine: timer sweep + **tiered apply** (auto-submit strong matches, queue the maybes) | Later |
| M4 | Phase 2 — LinkedIn outreach: find recruiters → auto-connect → AI message | Later |

**Execution strategy (decided):** *contract first, then fan out.* M1 is the sequential "neck" — the shared interfaces every later adapter depends on. Once M1 merges and the interfaces are frozen, M2/M3/M4 are built by a **parallel subagent fleet**, each agent isolated in its own git worktree, each implementing only the frozen interfaces. M1 must therefore stay small and low-risk.

---

## 2. Goals & non-goals

**Goals**
- Define a stable contract that separates *finding* jobs from *applying* to them.
- Refactor the existing Adzuna client into that contract with no behavior change.
- Ship **Greenhouse as the first apply target**, proving fast/structured (non-LinkedIn) auto-apply.
- Make the data model multi-source safe (jobs from two sites can't collide).

**Non-goals (deferred to later milestones)**
- Any additional source/apply adapters beyond Adzuna + Greenhouse (M2).
- The autonomous timer loop and tiered auto-submit thresholds (M3).
- LinkedIn outreach (M4).
- Global "search all Greenhouse companies" — no such API exists; discovery stays with aggregators.

---

## 3. The contract

The two example sources are mirror images, so the contract is **two interfaces**, not one. An adapter implements only the half it can do.

```ts
// src/lib/sources/types.ts

/** A job normalized across all sources. Extends today's NormalizedJob. */
export interface NormalizedJob {
  source: string;          // adapter id, e.g. "adzuna"
  externalId: string;      // unique *within* its source
  title: string;
  company: string;
  location: string;
  salary: string | null;
  jobType: string | null;
  url: string;             // human-viewable listing URL
  applyUrl: string | null; // where to apply, when known/different from url
  description: string;
}

export interface JobSearchCriteria {
  query: string;
  location?: string;
  remote?: boolean;
  maxDaysOld?: number;
  limit?: number;
}

/** Can DISCOVER jobs. Adzuna implements this; Greenhouse does not. */
export interface JobSource {
  readonly id: string;       // "adzuna"
  readonly label: string;    // "Adzuna"
  isConfigured(): boolean;   // credentials present?
  search(criteria: JobSearchCriteria): Promise<NormalizedJob[]>;
}

export interface ApplicantProfile {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  resumePath?: string;                 // local file path to resume
  answers: Record<string, string>;     // canonical-label → answer (for fuzzy matching)
}

export type ApplyOutcome = "submitted" | "skipped" | "failed" | "needs_review";

export interface ApplyResult {
  outcome: ApplyOutcome;
  method: "api" | "browser";
  message?: string;
  screenshotPath?: string;             // for browser / needs_review paths
}

/** Can APPLY to a job. Greenhouse implements this; Adzuna does not. */
export interface JobApplier {
  readonly id: string;                 // "greenhouse"
  canApply(job: NormalizedJob): boolean;
  apply(job: NormalizedJob, profile: ApplicantProfile): Promise<ApplyResult>;
}
```

### Registry

```ts
// src/lib/sources/registry.ts
export function registeredSources(): JobSource[];      // [AdzunaSource]
export function registeredAppliers(): JobApplier[];    // [GreenhouseApplier]
export function applierFor(job: NormalizedJob): JobApplier | null; // first canApply() === true
```

`applierFor` matches by the **host of `applyUrl`** (falling back to `url`): a host containing `greenhouse.io` → `GreenhouseApplier`. Unknown hosts return `null`. The existing LinkedIn flow is *not* wrapped as a `JobApplier` in M1 — it stays as-is; wiring it behind the interface is an M3 concern when the engine is built.

### What invokes the applier in M1 (the "end-to-end" path)

There is **no autonomous engine in M1** (that's M3). To make Greenhouse apply reachable and demonstrable, M1 adds a **manual trigger**: an "Apply" action on a discovered job's detail page.

- New route `POST /api/jobs/[id]/apply` → loads the `DiscoveredJob`, builds the `ApplicantProfile`, calls `applierFor(job)`.
  - applier found → `apply()`, then persist `applyOutcome` + `appliedAt`.
  - applier `null` → respond "no applier for this host" (button disabled/hidden in the UI for non-Greenhouse jobs).
- The detail page (currently `/indeed/[id]`, now backed by `DiscoveredJob`) gains an **Apply** button shown only when `applierFor(job)` is non-null, surfacing the `ApplyResult` (submitted / needs_review / failed) and any screenshot.

This proves the full contract path — discover (Adzuna) → normalize → route (registry) → apply (Greenhouse) → record — without any of the M3 timer/tiering machinery.

---

## 4. Adzuna refactor

`AdzunaSource implements JobSource` is a thin wrapper over the existing `searchAdzuna()` in `src/lib/jobs/adzuna.ts`:
- `id = "adzuna"`, `isConfigured()` checks `ADZUNA_APP_ID`/`ADZUNA_APP_KEY`.
- `search()` translates `JobSearchCriteria` → the existing `AdzunaSearchParams` and stamps `source: "adzuna"` + `applyUrl` onto each `NormalizedJob`.

The low-level `adzuna.ts` client stays put; we wrap, not rewrite. **No behavior change** — existing Adzuna tests must stay green.

---

## 5. Greenhouse apply

`GreenhouseApplier implements JobApplier`.

- **`canApply(job)`** — host of `applyUrl`/`url` contains `greenhouse.io`.
- **`apply(job, profile)`** — *API-first, browser-fallback*:
  1. Parse `{board_token, job_id}` from the URL (standard hosted forms: `boards.greenhouse.io/{token}/jobs/{id}`, `job-boards.greenhouse.io/{token}/jobs/{id}`).
  2. `GET https://boards-api.greenhouse.io/v1/boards/{token}/jobs/{id}?questions=true` → required/optional questions.
  3. Map `ApplicantProfile` → answers using the existing **fuzzy field-matcher** (`src/lib/field-matcher.ts`), the same label-alias logic the LinkedIn filler uses.
  4. If a **required** question can't be resolved → return `{ outcome: "needs_review" }` (no guessing on real applications).
  5. Otherwise `POST` the application (resume as multipart) to `…/v1/boards/{token}/jobs/{id}`.
     - On `401/403`/auth-required → **fall back** to the browser form-filler.
     - On success → `{ outcome: "submitted", method: "api" }`.
- **Browser fallback** — one reusable Playwright filler navigates the Greenhouse-hosted form and fills via the existing form-filler utilities. Because every Greenhouse form shares the same DOM, a *single* filler covers all companies (unlike LinkedIn's per-job variance). Returns `method: "browser"` with a screenshot.

**`ApplicantProfile` assembly** (`src/lib/sources/profile.ts`) — `assembleApplicantProfile()` builds the profile from existing models: `Credential` (identity/contact), `ProfileAnswer` (the pre-filled answers), and `Resume` (file path). No new user-facing config in M1.

---

## 6. Data model change

Make the discovered-job table multi-source safe. Applied via `prisma db push` (the project's workflow; no migrate files).

- Rename model `IndeedJob` → **`DiscoveredJob`**; `IndeedRequirement` → **`JobRequirement`**.
- `indeedJobId` → **`externalId`**; drop its standalone `@unique`.
- Add `source String @default("adzuna")`.
- Add **`@@unique([source, externalId])`** (the cross-source dedup key; `ingestJobs` dedup switches to this composite).
- Add light apply-tracking: `applyOutcome String?`, `appliedAt DateTime?` (populated when an applier runs; richer tracking lands in M3).

**Migration of existing rows:** current rows are Adzuna-sourced (per the recent pivot), so `source = "adzuna"` and `externalId = indeedJobId` are correct defaults.

**Ripple:** the `/indeed` UI routes, `/api/indeed/*` handlers, components under `src/components/indeed/`, and `src/lib/jobs/ingest.ts` reference the old names and must be updated. Route/page *paths* (`/indeed`) may stay as-is for M1 to bound the blast radius; only the model/field references must change. (Renaming the routes to `/jobs` or `/discovered` is an optional later cleanup.)

---

## 7. File layout

```
src/lib/sources/
  types.ts           # interfaces + types (the frozen contract)
  registry.ts        # registeredSources / registeredAppliers / applierFor
  adzuna-source.ts   # AdzunaSource implements JobSource (wraps src/lib/jobs/adzuna.ts)
  greenhouse.ts      # GreenhouseApplier implements JobApplier (+ browser fallback)
  profile.ts         # assembleApplicantProfile() from Credential/ProfileAnswer/Resume

src/app/api/jobs/[id]/apply/route.ts   # POST: manual apply trigger (the M1 end-to-end path)
```

Existing `src/lib/jobs/adzuna.ts` and `ingest.ts` stay; `ingest.ts` updates to the renamed model + composite dedup. The `/indeed/[id]` detail page + component gain the conditional **Apply** button.

---

## 8. Testing

Built **test-first** (write the failing test, then the code). Five layers, plus a hard safety guarantee and one opt-in manual check.

### 8.1 Unit tests (vitest) — pure logic, all I/O mocked

| Unit | Cases |
|------|-------|
| `applierFor` routing | each greenhouse host form → `GreenhouseApplier`; `linkedin.com`/unknown → `null`; matches on `applyUrl`, falls back to `url`; null/empty url → `null` |
| Greenhouse URL parse | `boards.greenhouse.io/{token}/jobs/{id}` and `job-boards.greenhouse.io/...` → `{token, jobId}`; malformed/missing id → parse error surfaced as `failed`, not a throw |
| Question → profile mapping | all required resolved → proceeds to submit; **unresolved required → `needs_review`** (never guesses); unresolved *optional* → still submits; alias matches go through `field-matcher` |
| `assembleApplicantProfile` | builds from `Credential` + `ProfileAnswer` + `Resume`; missing phone/resume handled (not a crash); no credential row → clear error |
| Apply outcomes (mocked board) | `2xx` → `submitted` (`method:"api"`); `401/403` → triggers **browser-fallback** path; `422`/validation → `failed` with message; network throw → `failed`, never unhandled |
| `AdzunaSource.search` | stamps `source:"adzuna"` + `applyUrl`; `JobSearchCriteria` → `AdzunaSearchParams` translation; output otherwise equals `searchAdzuna` (equivalence test pins "no behavior change") |

### 8.2 Contract-conformance suite (the fleet's safety net)

A **reusable** `describe.each` suite that *every* registered `JobSource`/`JobApplier` must pass — run against `AdzunaSource`/`GreenhouseApplier` now, and inherited unchanged by every M2 fleet adapter. This is what stops parallel agents from drifting off the contract.

- Every `JobSource`: `search()` returns `NormalizedJob[]`; every job has non-empty `externalId`, `source === source.id`, and all required fields present/typed.
- Every `JobApplier`: `canApply()` is pure & deterministic (same input → same output, no I/O); `apply()` resolves to a valid `ApplyResult` shape with a legal `outcome`/`method`.

### 8.3 Integration tests (vitest + isolated test DB, network mocked)

- `ingestJobs` composite dedup: same `externalId` across **different** sources → both stored; same `(source, externalId)` → deduped.
- `POST /api/jobs/[id]/apply`: seed a Greenhouse `DiscoveredJob` + mocked board → asserts `applyOutcome`/`appliedAt` persisted and the `ApplyResult` returned; a non-Greenhouse job → "no applier" response, `apply()` never called.
- Reuses the existing `tests/integration` test-DB isolation.

### 8.4 Browser-fallback test (Playwright, no live site)

The Greenhouse browser filler runs against a **saved Greenhouse form HTML fixture served locally** — not the real site. Asserts fields fill and submit is invoked (submit button intercepted/stubbed). Deterministic, offline, and proves the one-filler-fits-all-boards claim.

### 8.5 Fixtures

Capture one real Greenhouse board API response (`GET …/jobs/{id}?questions=true`) **once**, sanitize, and commit as a fixture so mapping/apply tests run against realistic question shapes. Same for the saved form HTML.

### 8.6 Hard safety guarantee — no real submissions, ever

- Global test setup installs a `fetch` guard that **throws** on any un-mocked request to `*.greenhouse.io` (or any real host). A real network call during tests fails loudly instead of leaking a submission.
- No test path reaches a real `POST` to an employer. CI is fully offline.

### 8.7 Manual live-apply verification (opt-in, human-run, not CI)

The *only* place a real submission happens: a documented checklist, gated behind an explicit `ALLOW_LIVE_APPLY=1` env flag, run by hand against a single known Greenhouse posting. Records outcome + screenshot. Never runs in automation.

### 8.8 Definition of done

- All new unit/contract/integration tests pass; the existing M0 suite (72 tests) stays green; `eslint` clean; `tsc` clean.
- The Adzuna equivalence test confirms the refactor changed no behavior.

---

## 9. Risks & open questions

- **Greenhouse board-token extraction** varies by URL form (hosted vs. embedded-on-career-site). M1 handles the standard hosted forms; embedded detection is deferred.
- **POST auth variance** — some boards reject unauthenticated submits; the browser fallback is the safety net, so this is a graceful degrade, not a blocker.
- **Resume upload encoding** (multipart vs. base64) is confirmed against a live board during implementation.
- **Legacy rows** — if any genuinely Indeed-scraped rows predate the Adzuna pivot and lack a usable `applyUrl`, they simply have no matching applier (queued, not errored).

---

## 10. Decisions locked in this design

1. **Tiered apply** behavior (auto-submit strong matches, queue maybes) is the target UX — implemented in M3, but the contract leaves room for it.
2. **Greenhouse = apply-path**, not a discovery source.
3. **Rename `IndeedJob` → `DiscoveredJob`** now, to stop M2 agents inheriting a misnomer.
4. **API-first, browser-fallback** for Greenhouse apply.
5. **Contract-first execution**, then parallel fleet for M2–M4.
