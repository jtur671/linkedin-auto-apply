# Adzuna Job Source Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Playwright Indeed scraper with the free Adzuna job-search REST API as the source feeding the existing `IndeedJob` pipeline (requirement parsing + AI match-scoring + UI), eliminating a headless browser for job discovery.

**Architecture:** A small `src/lib/jobs/` module fetches and normalizes Adzuna results (pure, testable). An `ingestJobs` function writes normalized jobs into the existing `IndeedJob` table with parsed requirements. `startIndeedScrape()` is repointed from Playwright search/scrape to `searchAdzuna()` + `ingestJobs()`; match-scoring, state, API routes, and DB models are unchanged. No schema change (the `IndeedJob`/`IndeedRequirement` tables already exist).

**Tech Stack:** Next.js 16, TypeScript, Prisma + better-sqlite3, vitest. Adzuna Search API (`https://api.adzuna.com/v1/api/jobs/{country}/search/{page}`).

**Known tradeoff (documented, accepted):** Adzuna returns only a *truncated description snippet*, so requirement extraction and match-scoring score on thinner text than the old full-page scrape. The pipeline still runs; quality is lower. This is inherent to the aggregator API.

---

## Prerequisite (one-time user action — not a code task)

The Adzuna API needs a free `app_id` + `app_key`.

- [ ] Register at <https://developer.adzuna.com/signup> (free), create an application, and copy the **App ID** and **App Key**.
- [ ] Add them to `.env` (create the keys if absent):

```
ADZUNA_APP_ID=your_app_id
ADZUNA_APP_KEY=your_app_key
ADZUNA_COUNTRY=us
```

**Note:** Every test in this plan mocks `fetch`, so implementation and the full test suite run green *without* real credentials. Keys are only needed for a live `POST /api/indeed/scrape` run.

---

## Task 1: Salary formatter (pure function)

**Files:**
- Create: `src/lib/jobs/adzuna.ts`
- Test: `tests/unit/adzuna.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/adzuna.test.ts
import { describe, it, expect } from "vitest";
import { formatSalary } from "@/lib/jobs/adzuna";

describe("formatSalary", () => {
  it("formats a min–max range with thousands separators", () => {
    expect(formatSalary(50000, 70000, false)).toBe("50,000–70,000");
  });
  it("marks predicted salaries as estimated", () => {
    expect(formatSalary(50000, 70000, true)).toBe("50,000–70,000 (estimated)");
  });
  it("handles a single bound", () => {
    expect(formatSalary(80000, undefined, false)).toBe("80,000");
  });
  it("returns null when no salary is present", () => {
    expect(formatSalary(undefined, undefined, false)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/adzuna.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/jobs/adzuna"` / `formatSalary is not a function`.

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/lib/jobs/adzuna.ts
export function formatSalary(
  min?: number,
  max?: number,
  predicted?: boolean,
): string | null {
  if (min == null && max == null) return null;
  const fmt = (n: number) => Math.round(n).toLocaleString("en-US");
  const range =
    min != null && max != null
      ? `${fmt(min)}–${fmt(max)}`
      : fmt((min ?? max) as number);
  return predicted ? `${range} (estimated)` : range;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/adzuna.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/jobs/adzuna.ts tests/unit/adzuna.test.ts
git commit -m "feat: add Adzuna salary formatter"
```

---

## Task 2: Adzuna result mapper (pure function)

**Files:**
- Modify: `src/lib/jobs/adzuna.ts`
- Test: `tests/unit/adzuna.test.ts`

- [ ] **Step 1: Write the failing test** (append to `tests/unit/adzuna.test.ts`)

```typescript
import { mapAdzunaResult, type AdzunaRawResult } from "@/lib/jobs/adzuna";

describe("mapAdzunaResult", () => {
  const raw: AdzunaRawResult = {
    id: "123456789",
    title: "  Senior QA Engineer  ",
    company: { display_name: "Acme Corp" },
    location: { display_name: "Austin, TX" },
    description: "We need 5+ years of automation testing experience…",
    redirect_url: "https://www.adzuna.com/land/ad/123456789",
    salary_min: 90000,
    salary_max: 120000,
    salary_is_predicted: "0",
    contract_time: "full_time",
    contract_type: "permanent",
  };

  it("maps and trims core fields", () => {
    const job = mapAdzunaResult(raw);
    expect(job.externalId).toBe("123456789");
    expect(job.title).toBe("Senior QA Engineer");
    expect(job.company).toBe("Acme Corp");
    expect(job.location).toBe("Austin, TX");
    expect(job.url).toBe("https://www.adzuna.com/land/ad/123456789");
    expect(job.description).toBe("We need 5+ years of automation testing experience…");
    expect(job.salary).toBe("90,000–120,000");
    expect(job.jobType).toBe("full_time");
  });

  it("applies safe defaults for missing optional fields", () => {
    const job = mapAdzunaResult({ id: 42 } as unknown as AdzunaRawResult);
    expect(job.externalId).toBe("42");
    expect(job.title).toBe("Untitled");
    expect(job.company).toBe("Unknown");
    expect(job.location).toBe("");
    expect(job.salary).toBeNull();
    expect(job.jobType).toBeNull();
    expect(job.url).toBe("");
    expect(job.description).toBe("");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/adzuna.test.ts -t mapAdzunaResult`
Expected: FAIL — `mapAdzunaResult is not a function`.

- [ ] **Step 3: Write minimal implementation** (append to `src/lib/jobs/adzuna.ts`)

```typescript
export interface AdzunaRawResult {
  id: string | number;
  title?: string;
  company?: { display_name?: string };
  location?: { display_name?: string };
  description?: string;
  redirect_url?: string;
  salary_min?: number;
  salary_max?: number;
  salary_is_predicted?: string | number | boolean;
  contract_time?: string;
  contract_type?: string;
}

export interface NormalizedJob {
  externalId: string;
  title: string;
  company: string;
  location: string;
  salary: string | null;
  jobType: string | null;
  url: string;
  description: string;
}

export function mapAdzunaResult(r: AdzunaRawResult): NormalizedJob {
  return {
    externalId: String(r.id),
    title: r.title?.trim() || "Untitled",
    company: r.company?.display_name?.trim() || "Unknown",
    location: r.location?.display_name?.trim() || "",
    salary: formatSalary(r.salary_min, r.salary_max, !!Number(r.salary_is_predicted)),
    jobType: r.contract_time ?? r.contract_type ?? null,
    url: r.redirect_url ?? "",
    description: r.description?.trim() || "",
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/adzuna.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/jobs/adzuna.ts tests/unit/adzuna.test.ts
git commit -m "feat: map Adzuna API results to normalized jobs"
```

---

## Task 3: Adzuna search client (fetch wrapper)

**Files:**
- Modify: `src/lib/jobs/adzuna.ts`
- Test: `tests/unit/adzuna.test.ts`

- [ ] **Step 1: Write the failing test** (append to `tests/unit/adzuna.test.ts`)

```typescript
import { searchAdzuna } from "@/lib/jobs/adzuna";
import { vi, afterEach } from "vitest";

describe("searchAdzuna", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  function stubEnv() {
    vi.stubEnv("ADZUNA_APP_ID", "id123");
    vi.stubEnv("ADZUNA_APP_KEY", "key456");
    vi.stubEnv("ADZUNA_COUNTRY", "us");
  }

  it("throws a clear error when credentials are missing", async () => {
    vi.stubEnv("ADZUNA_APP_ID", "");
    vi.stubEnv("ADZUNA_APP_KEY", "");
    await expect(searchAdzuna({ what: "qa" })).rejects.toThrow(/ADZUNA_APP_ID/);
  });

  it("builds the request URL and returns mapped jobs", async () => {
    stubEnv();
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        results: [
          { id: "1", title: "QA", company: { display_name: "Co" }, location: { display_name: "Remote" }, redirect_url: "u", description: "d" },
        ],
      }),
    }));
    vi.stubGlobal("fetch", fetchMock);

    const jobs = await searchAdzuna({ what: "qa engineer", where: "Austin", resultsPerPage: 50 });

    expect(jobs).toHaveLength(1);
    expect(jobs[0].title).toBe("QA");
    const calledUrl = String(fetchMock.mock.calls[0][0]);
    expect(calledUrl).toContain("/v1/api/jobs/us/search/1");
    expect(calledUrl).toContain("app_id=id123");
    expect(calledUrl).toContain("app_key=key456");
    expect(calledUrl).toContain("what=qa+engineer");
    expect(calledUrl).toContain("where=Austin");
    expect(calledUrl).toContain("results_per_page=50");
  });

  it("throws on non-ok responses", async () => {
    stubEnv();
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 429, text: async () => "rate limited" })));
    await expect(searchAdzuna({ what: "qa" })).rejects.toThrow(/429/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/adzuna.test.ts -t searchAdzuna`
Expected: FAIL — `searchAdzuna is not a function`.

- [ ] **Step 3: Write minimal implementation** (append to `src/lib/jobs/adzuna.ts`)

```typescript
const ADZUNA_BASE = "https://api.adzuna.com/v1/api/jobs";

export interface AdzunaConfig {
  appId: string;
  appKey: string;
  country: string;
}

export function getAdzunaConfig(): AdzunaConfig {
  return {
    appId: process.env.ADZUNA_APP_ID ?? "",
    appKey: process.env.ADZUNA_APP_KEY ?? "",
    country: (process.env.ADZUNA_COUNTRY ?? "us").toLowerCase(),
  };
}

export interface AdzunaSearchParams {
  what: string;
  where?: string;
  resultsPerPage?: number;
  maxDaysOld?: number;
}

export async function searchAdzuna(
  params: AdzunaSearchParams,
): Promise<NormalizedJob[]> {
  const { appId, appKey, country } = getAdzunaConfig();
  if (!appId || !appKey) {
    throw new Error(
      "Adzuna credentials missing. Set ADZUNA_APP_ID and ADZUNA_APP_KEY in your .env file.",
    );
  }
  const url = new URL(`${ADZUNA_BASE}/${country}/search/1`);
  url.searchParams.set("app_id", appId);
  url.searchParams.set("app_key", appKey);
  url.searchParams.set("results_per_page", String(params.resultsPerPage ?? 50));
  url.searchParams.set("what", params.what);
  if (params.where) url.searchParams.set("where", params.where);
  if (params.maxDaysOld) url.searchParams.set("max_days_old", String(params.maxDaysOld));
  url.searchParams.set("content-type", "application/json");

  const res = await fetch(url.toString());
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Adzuna API error ${res.status}: ${body}`);
  }
  const data = (await res.json()) as { results?: AdzunaRawResult[] };
  return (data.results ?? []).map(mapAdzunaResult);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/adzuna.test.ts`
Expected: PASS (9 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/jobs/adzuna.ts tests/unit/adzuna.test.ts
git commit -m "feat: add Adzuna search client"
```

---

## Task 4: Ingest normalized jobs into the DB

**Files:**
- Create: `src/lib/jobs/ingest.ts`
- Test: `tests/integration/db/adzuna-ingest.test.ts`

`ingestJobs` dedups against existing `IndeedJob.indeedJobId`, parses requirements, and creates rows. The requirement parser is injected (`parseFn`) so tests stay deterministic and never call the AI.

- [ ] **Step 1: Write the failing test**

```typescript
// tests/integration/db/adzuna-ingest.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/db";
import { ingestJobs } from "@/lib/jobs/ingest";
import type { NormalizedJob } from "@/lib/jobs/adzuna";

const job = (id: string): NormalizedJob => ({
  externalId: id,
  title: "QA Engineer",
  company: "Acme",
  location: "Remote",
  salary: "90,000–120,000",
  jobType: "full_time",
  url: `https://adzuna/${id}`,
  description: "5+ years automation testing",
});

const fakeParse = async () => [
  { category: "experience", requirement: "5+ years automation testing", isRequired: true },
];

describe("ingestJobs", () => {
  beforeEach(async () => {
    await prisma.indeedRequirement.deleteMany();
    await prisma.indeedJob.deleteMany();
  });

  it("creates IndeedJob rows with parsed requirements", async () => {
    const ids = await ingestJobs([job("a")], "qa", new Set(), fakeParse);
    expect(ids).toHaveLength(1);
    const saved = await prisma.indeedJob.findUnique({
      where: { indeedJobId: "a" },
      include: { requirements: true },
    });
    expect(saved?.title).toBe("QA Engineer");
    expect(saved?.searchQuery).toBe("qa");
    expect(saved?.applyUrl).toBe("https://adzuna/a");
    expect(saved?.requirements).toHaveLength(1);
  });

  it("skips jobs whose externalId is already known", async () => {
    const ids = await ingestJobs([job("dup")], "qa", new Set(["dup"]), fakeParse);
    expect(ids).toHaveLength(0);
    expect(await prisma.indeedJob.count()).toBe(0);
  });

  it("adds newly-ingested ids to the seen set to dedup within a run", async () => {
    const seen = new Set<string>();
    const ids = await ingestJobs([job("x"), job("x")], "qa", seen, fakeParse);
    expect(ids).toHaveLength(1);
    expect(await prisma.indeedJob.count()).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/integration/db/adzuna-ingest.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/jobs/ingest"`.

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/lib/jobs/ingest.ts
import { prisma } from "@/lib/db";
import { parseRequirements, type ParsedRequirement } from "@/lib/automation/indeed/parse-requirements";
import type { NormalizedJob } from "@/lib/jobs/adzuna";

type ParseFn = (descriptionHtml: string, descriptionText: string) => Promise<ParsedRequirement[]>;

/**
 * Persist normalized jobs as IndeedJob rows (model name retained to avoid a
 * migration; the source is now Adzuna). Dedups against `seenIds`, which is
 * mutated to also block duplicates within a single run. Returns created row ids.
 */
export async function ingestJobs(
  jobs: NormalizedJob[],
  searchQuery: string,
  seenIds: Set<string>,
  parseFn: ParseFn = parseRequirements,
): Promise<number[]> {
  const createdIds: number[] = [];
  for (const job of jobs) {
    if (seenIds.has(job.externalId)) continue;
    seenIds.add(job.externalId);

    let requirements: ParsedRequirement[];
    try {
      requirements = await parseFn(job.description, job.description);
    } catch {
      requirements = [];
    }

    const saved = await prisma.indeedJob.create({
      data: {
        indeedJobId: job.externalId,
        title: job.title,
        company: job.company,
        location: job.location,
        salary: job.salary,
        jobType: job.jobType,
        url: job.url,
        applyUrl: job.url,
        descriptionRaw: job.description,
        searchQuery,
        requirements: {
          create: requirements.map((r) => ({
            category: r.category,
            requirement: r.requirement,
            isRequired: r.isRequired,
          })),
        },
      },
    });
    createdIds.push(saved.id);
  }
  return createdIds;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/integration/db/adzuna-ingest.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/jobs/ingest.ts tests/integration/db/adzuna-ingest.test.ts
git commit -m "feat: ingest normalized jobs into IndeedJob table"
```

---

## Task 5: Repoint the engine from Playwright to Adzuna

**Files:**
- Modify (full rewrite): `src/lib/automation/indeed/engine-indeed.ts`

This removes the browser entirely. `startIndeedScrape()` now loops configs → `searchAdzuna` → `ingestJobs` → `scoreJobMatch`. State fields, the logger, and `scoreJobMatch` are unchanged. No new unit test: the moving parts (`searchAdzuna`, `ingestJobs`) are already covered; this task is orchestration, verified by typecheck + the full suite.

- [ ] **Step 1: Replace the file contents**

```typescript
// src/lib/automation/indeed/engine-indeed.ts
import { searchAdzuna, type NormalizedJob } from "@/lib/jobs/adzuna";
import { ingestJobs } from "@/lib/jobs/ingest";
import { scoreJobMatch } from "./match-scorer";
import {
  getIndeedState,
  updateIndeedState,
  resetIndeedState,
} from "./state-indeed";
import { AutomationLogger } from "@/lib/logging/logger";
import { prisma } from "@/lib/db";

export async function startIndeedScrape(): Promise<void> {
  const logger = new AutomationLogger();
  logger.log({ action: "indeed_start" });
  resetIndeedState();
  updateIndeedState({
    status: "running",
    phase: "searching",
    startedAt: new Date().toISOString(),
  });

  try {
    const configs = await prisma.searchConfig.findMany({ where: { isActive: true } });
    if (configs.length === 0) {
      updateIndeedState({ status: "error", phase: "No active search configs" });
      logger.log({ action: "indeed_stop", reason: "no_configs" });
      return;
    }

    const existing = await prisma.indeedJob.findMany({ select: { indeedJobId: true } });
    const seenIds = new Set(existing.map((j) => j.indeedJobId));

    const savedJobIds: number[] = [];
    for (const config of configs) {
      if (getIndeedState().status === "stopping") break;

      let jobs: NormalizedJob[];
      try {
        jobs = await searchAdzuna({
          what: config.keywords,
          where: config.location || undefined,
          resultsPerPage: 50,
        });
      } catch (err) {
        updateIndeedState({ errors: getIndeedState().errors + 1 });
        logger.log({ action: "indeed_error", reason: String(err) });
        continue;
      }
      updateIndeedState({ searched: getIndeedState().searched + jobs.length });

      const ids = await ingestJobs(jobs, config.keywords, seenIds);
      savedJobIds.push(...ids);
      updateIndeedState({
        scraped: getIndeedState().scraped + ids.length,
        total: getIndeedState().total + jobs.length,
      });
    }

    // Phase: AI match scoring (unchanged behavior)
    const hasResume = await prisma.resume.findFirst({ where: { isActive: true } });
    if (hasResume && savedJobIds.length > 0) {
      updateIndeedState({ phase: "scoring" });
      for (const id of savedJobIds) {
        if (getIndeedState().status === "stopping") break;
        try {
          await scoreJobMatch(id);
          updateIndeedState({ scored: getIndeedState().scored + 1 });
        } catch {
          updateIndeedState({ errors: getIndeedState().errors + 1 });
        }
        await new Promise((r) => setTimeout(r, 1500));
      }
    }

    logger.log({
      action: "indeed_stop",
      details: {
        searched: getIndeedState().searched,
        scraped: getIndeedState().scraped,
        scored: getIndeedState().scored,
        errors: getIndeedState().errors,
      },
    });
    updateIndeedState({ status: "idle", phase: null });
  } catch (err) {
    logger.log({ action: "indeed_stop", reason: String(err) });
    updateIndeedState({ status: "error", phase: `Error: ${String(err)}` });
  }
}

export async function stopIndeedScrape(): Promise<void> {
  updateIndeedState({ status: "stopping" });
  // No browser to tear down; settle back to idle promptly.
  setTimeout(() => {
    if (getIndeedState().status === "stopping") {
      updateIndeedState({ status: "idle", phase: null });
    }
  }, 500);
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors. (`startIndeedScrape` / `stopIndeedScrape` keep the same exported signatures, so `src/app/api/indeed/scrape/route.ts` still compiles.)

- [ ] **Step 3: Run the full suite**

Run: `npm test`
Expected: PASS — all prior tests plus the new Adzuna unit + ingest integration tests.

- [ ] **Step 4: Commit**

```bash
git add src/lib/automation/indeed/engine-indeed.ts
git commit -m "feat: drive Indeed job discovery from Adzuna instead of Playwright"
```

---

## Task 6: Config + cleanup

**Files:**
- Modify: `.env.example`
- Modify: `src/components/sidebar.tsx`
- Delete: `src/lib/automation/indeed/search-indeed.ts`, `src/lib/automation/indeed/scrape-indeed.ts`

- [ ] **Step 1: Add Adzuna keys to `.env.example`**

Append to `.env.example`:

```
ADZUNA_APP_ID=
ADZUNA_APP_KEY=
ADZUNA_COUNTRY=us
```

- [ ] **Step 2: Relabel the sidebar nav item** (the data is no longer Indeed)

In `src/components/sidebar.tsx`, change the one line:

```typescript
  { href: "/indeed", label: "Indeed Jobs", icon: Globe },
```
to:
```typescript
  { href: "/indeed", label: "Adzuna Jobs", icon: Globe },
```

(Broader UI re-labeling of "Indeed" strings in `src/app/indeed/**` and `src/components/indeed/**` is cosmetic and intentionally OUT OF SCOPE for this plan.)

- [ ] **Step 3: Confirm the Playwright Indeed files are now orphaned**

Run: `grep -rn "search-indeed\|scrape-indeed" src --include='*.ts' --include='*.tsx'`
Expected: no matches (Task 5 removed the only importers).

- [ ] **Step 4: Delete the orphaned files**

```bash
git rm src/lib/automation/indeed/search-indeed.ts src/lib/automation/indeed/scrape-indeed.ts
```

- [ ] **Step 5: Typecheck and run the suite**

Run: `npx tsc --noEmit && npm test`
Expected: typecheck clean; all tests pass.

- [ ] **Step 6: Commit**

```bash
git add .env.example src/components/sidebar.tsx
git commit -m "chore: add Adzuna env vars, relabel nav, remove dead Indeed scrapers"
```

---

## Done criteria

- `npm test` green (existing suite + new Adzuna unit tests + ingest integration test).
- `npx tsc --noEmit` clean.
- With real Adzuna keys in `.env`, `POST /api/indeed/scrape` populates `IndeedJob` rows from Adzuna and the existing Indeed UI + match scores render — no headless browser launched.
- `indeed-filter-builder.ts` note: it is only used by the deleted `search-indeed.ts`; if Step 3's grep shows no other importer, it may also be removed in a follow-up (left in place here to keep this plan's blast radius small).
```
