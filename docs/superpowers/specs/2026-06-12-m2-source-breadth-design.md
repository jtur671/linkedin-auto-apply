# M2 — Source Breadth: Plug In the Universe

**Date:** 2026-06-12
**Status:** Approved roadmap milestone (see M1 spec for roadmap + decisions)
**Builds on:** `2026-06-12-job-source-contract-m1-design.md` — the frozen `JobSource`/`JobApplier` contract.

## 1. Goal

Expand discovery from Adzuna-only to a fleet of API sources, and route the discovery engine through the registry. This is the milestone that makes M1's Greenhouse applier *reachable*: aggregators (especially Hiring Cafe) surface jobs whose apply URLs point directly at `greenhouse.io` / `lever.co` / `ashbyhq.com` hosted forms.

Execution model (decided in roadmap): **parallel subagent fleet**, one agent per adapter, all implementing the frozen contract. Adapters touch only their own files; registry/engine integration is a sequential step at the end.

## 2. Scope

**New discovery sources** (`JobSource`, all fetch-based, no browser):

| id | API | Auth | Notes |
|----|-----|------|-------|
| `remotive` | `GET https://remotive.com/api/remote-jobs?search=&limit=` | none | remote jobs, JSON |
| `remoteok` | `GET https://remoteok.com/api` | none | full feed; filter client-side by query; first array element is metadata — skip it |
| `himalayas` | `GET https://himalayas.app/jobs/api` | none | remote jobs, JSON |
| `usajobs` | `GET https://data.usajobs.gov/api/search?Keyword=` | `USAJOBS_API_KEY` + `USAJOBS_USER_AGENT` (email) headers | env-gated via `isConfigured()` |
| `hiringcafe` | internal `POST https://hiring.cafe/api/search-jobs` (undocumented) | none known | **pending recon** — built only if the recon probe confirms a usable JSON endpoint; its results carry direct ATS apply URLs (the high-value source) |

**New appliers** (`JobApplier`):

| id | canApply host | apply strategy |
|----|---------------|----------------|
| `lever` | `jobs.lever.co` | Browser form-filler (Lever hosted forms share a uniform DOM: name/email/phone/org/resume). The Postings apply API needs a company-owned key, so API-first isn't possible anonymously — browser is the primary path. |
| `ashby` | `jobs.ashbyhq.com` | `canApply` true; `apply()` attempts nothing in M2 and returns `needs_review` with a message. Ashby hosted forms are dynamic React with per-board custom fields and no anonymous submit API; a real filler is future work. Routing these to the review queue is honest and feeds M3's tiered queue. |

**Engine integration:** `startIndeedScrape` (`src/lib/automation/indeed/engine-indeed.ts`) replaces its direct `searchAdzuna` call with a loop over `registeredSources().filter(s => s.isConfigured())`, building one `JobSearchCriteria` per search config. Per-source errors increment the error counter and continue (one bad source must not kill the sweep). `ingestJobs` is already multi-source-safe (`(source, externalId)` dedup + P2002 idempotency).

**Conventions every adapter must follow** (locked in M1):
- Host checks anchored like Greenhouse's (`host === apex || host.endsWith(".apex")`, https-only) — never substring `.includes`.
- `NormalizedJob.applyUrl`: the most-direct apply link the source provides, else `null` (never `""`).
- Unit tests stub `fetch` (`vi.stubGlobal`); the global fetch-guard blocks anything un-stubbed. Fixtures are captured once from the real API (a single read-only curl during development) and committed.
- Each adapter registers in `src/lib/sources/registry.ts` (integration step) and is then automatically covered by the contract-conformance suite.

## 3. Out of scope (later milestones)

- The autonomous timer + tiered auto-submit (M3).
- An Ashby browser filler; Lever/Greenhouse *discovery* via per-company board polling.
- LinkedIn outreach (M4).
- UI source toggles — sources are gated by env config only in M2.

## 4. Testing

Per adapter: unit tests with stubbed fetch against the committed real-shape fixture (mapping correctness, query construction, error handling, `isConfigured`). Lever browser filler: Playwright spec against a local mock form (same pattern as `greenhouse-apply.spec.ts`). Engine wiring: integration test that a stubbed two-source registry sweep ingests from both and isolates a failing source. Conformance suite covers every registered adapter automatically. Full M1 suite stays green; tsc clean; no test touches a real network (fetch guard).
