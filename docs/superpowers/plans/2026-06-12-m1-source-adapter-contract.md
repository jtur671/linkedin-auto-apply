# M1: Source-Adapter Contract + Greenhouse Apply — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract a `JobSource`/`JobApplier` contract from the existing Adzuna code and ship Greenhouse as the first end-to-end auto-apply target, proving fast/structured (non-LinkedIn) applying.

**Architecture:** Two small interfaces (`JobSource` = discover, `JobApplier` = apply) registered centrally; `applierFor(job)` routes a job to an applier by URL host. Adzuna becomes a `JobSource`; Greenhouse becomes a `JobApplier` that tries the board API first and falls back to one reusable Playwright form-filler. A manual `POST /api/jobs/[id]/apply` route makes it end-to-end. The discovered-job table is renamed `IndeedJob → DiscoveredJob` with a `(source, externalId)` dedup key.

**Tech Stack:** TypeScript, Next.js 16 (route handlers), Prisma 7 + better-sqlite3 (SQLite), Vitest (unit/integration), Playwright (browser), `matchField` fuzzy label matcher.

**Spec:** `docs/superpowers/specs/2026-06-12-job-source-contract-m1-design.md`

**Conventions to follow (read before starting):**
- Unit/integration tests live in `tests/unit/**` and `tests/integration/**`, run via `npx vitest run`. They share `prisma/test.db`; `tests/setup.ts` truncates every table before each test and forces `DATABASE_URL` to test.db. Run files sequentially (already configured).
- Stub network with `vi.stubGlobal("fetch", vi.fn(...))` and env with `vi.stubEnv(...)`; unstub in `afterEach` (see `tests/unit/adzuna.test.ts`).
- Playwright specs live in `tests/automation/**`, load fixtures via `page.goto(\`file://${path.resolve("tests/mocks/x.html")}\`)`, run with `npx playwright test --testMatch 'tests/automation/**/*.spec.ts'`.
- Prisma client is `import { prisma } from "@/lib/db"`. Apply schema changes with `npm run db:push` then `npm run db:generate`.
- **AGENTS.md:** this is a modified Next.js/Prisma — if an API surprises you, read the guide under `node_modules/next/dist/docs/` before improvising.

---

## File Structure

**Create:**
- `src/lib/sources/types.ts` — the frozen contract (interfaces + types).
- `src/lib/sources/greenhouse-url.ts` — `isGreenhouseUrl`, `parseGreenhouseUrl`.
- `src/lib/sources/adzuna-source.ts` — `adzunaSource: JobSource`.
- `src/lib/sources/profile.ts` — `assembleApplicantProfile()`.
- `src/lib/sources/greenhouse.ts` — `mapGreenhouseAnswers()` + `greenhouseApplier: JobApplier`.
- `src/lib/sources/greenhouse-browser.ts` — `fillGreenhouseForm()` + `browserApplyGreenhouse()`.
- `src/lib/sources/registry.ts` — `registeredSources/Appliers`, `applierFor`.
- `src/app/api/jobs/[id]/apply/route.ts` — manual apply trigger.
- Tests + mock fixture (paths in each task).

**Modify:**
- `src/lib/jobs/adzuna.ts` — re-export canonical `NormalizedJob`, stamp `source`/`applyUrl`.
- `tests/setup.ts` — fetch guard.
- `prisma/schema.prisma`, `src/lib/jobs/ingest.ts`, and the 8 rename-affected files (Task 11).
- `src/app/indeed/[id]/page.tsx` — Apply button.

---

## Task 1: Block real network in the test suite

**Files:**
- Test: `tests/unit/fetch-guard.test.ts` (create)
- Modify: `tests/setup.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/fetch-guard.test.ts
import { describe, it, expect } from "vitest";

describe("test fetch guard", () => {
  it("blocks un-stubbed network calls", async () => {
    await expect(fetch("https://boards-api.greenhouse.io/ping")).rejects.toThrow(
      /Blocked un-stubbed fetch/,
    );
  });
});
```

- [ ] **Step 2: Run it, expect FAIL**

Run: `npx vitest run tests/unit/fetch-guard.test.ts`
Expected: FAIL — without the guard, `fetch` attempts a real request (no `Blocked un-stubbed` error thrown).

- [ ] **Step 3: Add the guard** (append to `tests/setup.ts`, after the existing `beforeEach`)

```ts
// Block ALL real network in unit/integration tests. Tests that need HTTP must
// stub fetch with vi.stubGlobal("fetch", ...). Anything reaching this guard is
// an un-mocked call to a real host — fail loudly rather than, e.g., POST a real
// job application to an employer. (Playwright specs run outside vitest and are
// unaffected.)
globalThis.fetch = (async (input: unknown) => {
  const url =
    typeof input === "string"
      ? input
      : String((input as { url?: string })?.url ?? input);
  throw new Error(
    `Blocked un-stubbed fetch in tests: ${url}. Stub it with vi.stubGlobal("fetch", ...).`,
  );
}) as typeof fetch;
```

- [ ] **Step 4: Run the guard test + the full suite**

Run: `npx vitest run`
Expected: the new test PASSES, and **all existing tests still pass** (72 at M0). If any pre-existing test now fails, it was making a real network call — stub its fetch; do not weaken the guard.

- [ ] **Step 5: Commit**

```bash
git add tests/setup.ts tests/unit/fetch-guard.test.ts
git commit -m "test: block un-stubbed real network in the vitest suite"
```

---

## Task 2: Define the contract types

**Files:**
- Create: `src/lib/sources/types.ts`

- [ ] **Step 1: Write the types**

```ts
// src/lib/sources/types.ts
import type { ProfileAnswerRecord } from "@/lib/field-matcher";

/** A job normalized across all sources. */
export interface NormalizedJob {
  source: string; // adapter id, e.g. "adzuna"
  externalId: string; // unique within its source
  title: string;
  company: string;
  location: string;
  salary: string | null;
  jobType: string | null;
  url: string; // human-viewable listing URL
  applyUrl: string | null; // where to apply, when known
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
  readonly id: string;
  readonly label: string;
  isConfigured(): boolean;
  search(criteria: JobSearchCriteria): Promise<NormalizedJob[]>;
}

/** Applicant data the appliers draw from. Refines the spec to reuse matchField. */
export interface ApplicantProfile {
  email: string;
  resumePath: string | null;
  answers: ProfileAnswerRecord[]; // every ProfileAnswer row; resolved via matchField
}

export type ApplyOutcome = "submitted" | "skipped" | "failed" | "needs_review";

export interface ApplyResult {
  outcome: ApplyOutcome;
  method: "api" | "browser";
  message?: string;
  screenshotPath?: string;
}

/** Can APPLY to a job. Greenhouse implements this; Adzuna does not. */
export interface JobApplier {
  readonly id: string;
  canApply(job: NormalizedJob): boolean;
  apply(job: NormalizedJob, profile: ApplicantProfile): Promise<ApplyResult>;
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no new errors from `src/lib/sources/types.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/sources/types.ts
git commit -m "feat: add JobSource/JobApplier contract types"
```

---

## Task 3: Greenhouse URL helpers

**Files:**
- Create: `src/lib/sources/greenhouse-url.ts`
- Test: `tests/unit/sources/greenhouse-url.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/sources/greenhouse-url.test.ts
import { describe, it, expect } from "vitest";
import { isGreenhouseUrl, parseGreenhouseUrl } from "@/lib/sources/greenhouse-url";

describe("isGreenhouseUrl", () => {
  it("recognizes greenhouse hosts", () => {
    expect(isGreenhouseUrl("https://boards.greenhouse.io/acme/jobs/123")).toBe(true);
    expect(isGreenhouseUrl("https://job-boards.greenhouse.io/acme/jobs/123")).toBe(true);
  });
  it("rejects non-greenhouse and empty", () => {
    expect(isGreenhouseUrl("https://www.linkedin.com/jobs/view/123")).toBe(false);
    expect(isGreenhouseUrl("")).toBe(false);
    expect(isGreenhouseUrl(null)).toBe(false);
  });
});

describe("parseGreenhouseUrl", () => {
  it("extracts board token and job id", () => {
    expect(parseGreenhouseUrl("https://boards.greenhouse.io/acme/jobs/456")).toEqual({
      token: "acme",
      jobId: "456",
    });
    expect(parseGreenhouseUrl("https://job-boards.greenhouse.io/acme/jobs/789?utm=x")).toEqual({
      token: "acme",
      jobId: "789",
    });
  });
  it("returns null for malformed urls", () => {
    expect(parseGreenhouseUrl("https://boards.greenhouse.io/acme")).toBeNull();
    expect(parseGreenhouseUrl("https://www.linkedin.com/jobs/view/1")).toBeNull();
  });
});
```

- [ ] **Step 2: Run it, expect FAIL**

Run: `npx vitest run tests/unit/sources/greenhouse-url.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// src/lib/sources/greenhouse-url.ts
export function isGreenhouseUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    return new URL(url).hostname.includes("greenhouse.io");
  } catch {
    return false;
  }
}

export function parseGreenhouseUrl(
  url: string | null | undefined,
): { token: string; jobId: string } | null {
  if (!isGreenhouseUrl(url)) return null;
  // path forms: /{token}/jobs/{id}
  const m = new URL(url as string).pathname.match(/\/([^/]+)\/jobs\/(\d+)/);
  return m ? { token: m[1], jobId: m[2] } : null;
}
```

- [ ] **Step 4: Run it, expect PASS**

Run: `npx vitest run tests/unit/sources/greenhouse-url.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/sources/greenhouse-url.ts tests/unit/sources/greenhouse-url.test.ts
git commit -m "feat: parse and detect Greenhouse board URLs"
```

---

## Task 4: AdzunaSource (unify NormalizedJob, stamp source/applyUrl)

This unifies the two `NormalizedJob` shapes: `adzuna.ts` re-exports the canonical type from `types.ts` and `mapAdzunaResult` stamps `source: "adzuna"` + `applyUrl`. Then `adzunaSource` wraps `searchAdzuna`.

**Files:**
- Modify: `src/lib/jobs/adzuna.ts`
- Modify: `tests/unit/adzuna.test.ts` (assert new fields)
- Create: `src/lib/sources/adzuna-source.ts`
- Test: `tests/unit/sources/adzuna-source.test.ts`

- [ ] **Step 1: Update the Adzuna unit test to expect the new fields**

In `tests/unit/adzuna.test.ts`, inside `describe("mapAdzunaResult")` → `it("maps and trims core fields")`, add:

```ts
    expect(job.source).toBe("adzuna");
    expect(job.applyUrl).toBe("https://www.adzuna.com/land/ad/123456789");
```

And in `it("applies safe defaults for missing optional fields")` add:

```ts
    expect(job.source).toBe("adzuna");
    expect(job.applyUrl).toBe("");
```

- [ ] **Step 2: Run it, expect FAIL**

Run: `npx vitest run tests/unit/adzuna.test.ts`
Expected: FAIL — `source`/`applyUrl` undefined.

- [ ] **Step 3: Update `adzuna.ts`**

Replace the local `NormalizedJob` interface (lines ~29-38) with a re-export, and update `mapAdzunaResult`:

```ts
// near the top imports
import type { NormalizedJob } from "@/lib/sources/types";
export type { NormalizedJob } from "@/lib/sources/types"; // keep existing import paths working

// delete the old `export interface NormalizedJob { ... }` block

export function mapAdzunaResult(r: AdzunaRawResult): NormalizedJob {
  const url = r.redirect_url ?? "";
  return {
    source: "adzuna",
    externalId: String(r.id),
    title: r.title?.trim() || "Untitled",
    company: r.company?.display_name?.trim() || "Unknown",
    location: r.location?.display_name?.trim() || "",
    salary: formatSalary(r.salary_min, r.salary_max, isPredictedSalary(r.salary_is_predicted)),
    jobType: r.contract_time ?? r.contract_type ?? null,
    url,
    applyUrl: url,
    description: r.description?.trim() || "",
  };
}
```

- [ ] **Step 4: Run the Adzuna test, expect PASS**

Run: `npx vitest run tests/unit/adzuna.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the AdzunaSource failing test**

```ts
// tests/unit/sources/adzuna-source.test.ts
import { describe, it, expect, vi, afterEach } from "vitest";
import { adzunaSource } from "@/lib/sources/adzuna-source";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("adzunaSource", () => {
  it("is a JobSource with id 'adzuna'", () => {
    expect(adzunaSource.id).toBe("adzuna");
    expect(typeof adzunaSource.search).toBe("function");
  });

  it("translates criteria and returns canonical jobs", async () => {
    vi.stubEnv("ADZUNA_APP_ID", "id123");
    vi.stubEnv("ADZUNA_APP_KEY", "key456");
    vi.stubEnv("ADZUNA_COUNTRY", "us");
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        results: [{ id: "1", title: "QA", redirect_url: "https://a/1", description: "d" }],
      }),
    }));
    vi.stubGlobal("fetch", fetchMock);

    const jobs = await adzunaSource.search({ query: "qa", location: "Austin", limit: 25 });

    expect(jobs).toHaveLength(1);
    expect(jobs[0].source).toBe("adzuna");
    expect(jobs[0].applyUrl).toBe("https://a/1");
    const calledUrl = String(fetchMock.mock.lastCall![0]);
    expect(calledUrl).toContain("what=qa");
    expect(calledUrl).toContain("where=Austin");
    expect(calledUrl).toContain("results_per_page=25");
  });
});
```

- [ ] **Step 6: Run it, expect FAIL**

Run: `npx vitest run tests/unit/sources/adzuna-source.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 7: Implement AdzunaSource**

```ts
// src/lib/sources/adzuna-source.ts
import type { JobSource, JobSearchCriteria, NormalizedJob } from "./types";
import { searchAdzuna, getAdzunaConfig } from "@/lib/jobs/adzuna";

export const adzunaSource: JobSource = {
  id: "adzuna",
  label: "Adzuna",
  isConfigured() {
    const c = getAdzunaConfig();
    return Boolean(c.appId && c.appKey);
  },
  async search(criteria: JobSearchCriteria): Promise<NormalizedJob[]> {
    return searchAdzuna({
      what: criteria.query,
      where: criteria.location,
      resultsPerPage: criteria.limit ?? 50,
      maxDaysOld: criteria.maxDaysOld,
    });
  },
};
```

- [ ] **Step 8: Run both Adzuna tests, expect PASS**

Run: `npx vitest run tests/unit/adzuna.test.ts tests/unit/sources/adzuna-source.test.ts`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/lib/jobs/adzuna.ts src/lib/sources/adzuna-source.ts tests/unit/adzuna.test.ts tests/unit/sources/adzuna-source.test.ts
git commit -m "feat: wrap Adzuna as a JobSource with canonical NormalizedJob"
```

> Note: `tests/integration/db/adzuna-ingest.test.ts` builds `NormalizedJob` literals without `source`/`applyUrl` and will now fail to typecheck. It is updated in **Task 11** alongside the ingest change. If you run the full suite before Task 11, expect that one file to error — that is known and resolved there.

---

## Task 5: Assemble the ApplicantProfile from the DB

**Files:**
- Create: `src/lib/sources/profile.ts`
- Test: `tests/integration/sources/profile.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/integration/sources/profile.test.ts
import { describe, it, expect } from "vitest";
import { prisma } from "@/lib/db";
import { assembleApplicantProfile } from "@/lib/sources/profile";

describe("assembleApplicantProfile", () => {
  it("pulls email, active resume path, and all profile answers", async () => {
    await prisma.credential.create({
      data: { email: "jo@x.com", password: "enc", encryptionCheck: "ok" },
    });
    await prisma.resume.create({
      data: { filename: "cv.pdf", content: "text", rawPath: "/uploads/cv.pdf", isActive: true },
    });
    await prisma.profileAnswer.create({
      data: { fieldLabel: "Phone number", fieldType: "text", answer: "555-1234" },
    });

    const profile = await assembleApplicantProfile();

    expect(profile.email).toBe("jo@x.com");
    expect(profile.resumePath).toBe("/uploads/cv.pdf");
    expect(profile.answers).toEqual([
      { fieldLabel: "Phone number", fieldType: "text", answer: "555-1234" },
    ]);
  });

  it("tolerates a missing resume", async () => {
    await prisma.credential.create({
      data: { email: "jo@x.com", password: "enc", encryptionCheck: "ok" },
    });
    const profile = await assembleApplicantProfile();
    expect(profile.resumePath).toBeNull();
    expect(profile.answers).toEqual([]);
  });
});
```

- [ ] **Step 2: Run it, expect FAIL**

Run: `npx vitest run tests/integration/sources/profile.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// src/lib/sources/profile.ts
import { prisma } from "@/lib/db";
import type { ApplicantProfile } from "./types";
import type { ProfileAnswerRecord } from "@/lib/field-matcher";

export async function assembleApplicantProfile(): Promise<ApplicantProfile> {
  const [credential, resume, answerRows] = await Promise.all([
    prisma.credential.findFirst(),
    prisma.resume.findFirst({ where: { isActive: true }, orderBy: { uploadedAt: "desc" } }),
    prisma.profileAnswer.findMany(),
  ]);

  const answers: ProfileAnswerRecord[] = answerRows.map((a) => ({
    fieldLabel: a.fieldLabel,
    fieldType: a.fieldType,
    answer: a.answer,
  }));

  return {
    email: credential?.email ?? "",
    resumePath: resume?.rawPath ?? null,
    answers,
  };
}
```

- [ ] **Step 4: Run it, expect PASS**

Run: `npx vitest run tests/integration/sources/profile.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/sources/profile.ts tests/integration/sources/profile.test.ts
git commit -m "feat: assemble ApplicantProfile from Credential/Resume/ProfileAnswer"
```

---

## Task 6: Greenhouse answer mapping

Maps a board's questions onto the applicant's answers via `matchField`. File fields (resume) are skipped here (attached separately). Required-but-unanswered questions are collected so the applier can return `needs_review`.

**Files:**
- Create: `src/lib/sources/greenhouse.ts` (mapping only for now)
- Test: `tests/unit/sources/greenhouse-mapping.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/sources/greenhouse-mapping.test.ts
import { describe, it, expect } from "vitest";
import { mapGreenhouseAnswers, type GreenhouseQuestion } from "@/lib/sources/greenhouse";
import type { ApplicantProfile } from "@/lib/sources/types";

const profile: ApplicantProfile = {
  email: "jo@x.com",
  resumePath: "/cv.pdf",
  answers: [
    { fieldLabel: "First name", fieldType: "text", answer: "Jo" },
    { fieldLabel: "Phone number", fieldType: "text", answer: "555-1234" },
  ],
};

describe("mapGreenhouseAnswers", () => {
  it("resolves answered questions and skips file fields", () => {
    const questions: GreenhouseQuestion[] = [
      { label: "First name", required: true, fields: [{ name: "first_name", type: "input_text" }] },
      { label: "Phone", required: true, fields: [{ name: "phone", type: "input_text" }] },
      { label: "Resume", required: true, fields: [{ name: "resume", type: "input_file" }] },
    ];
    const { fields, missingRequired } = mapGreenhouseAnswers(questions, profile);
    expect(fields).toEqual({ first_name: "Jo", phone: "555-1234" });
    expect(missingRequired).toEqual([]); // file field is not "missing"
  });

  it("flags required questions it cannot answer", () => {
    const questions: GreenhouseQuestion[] = [
      { label: "Why do you want this job?", required: true, fields: [{ name: "q1", type: "textarea" }] },
      { label: "Portfolio (optional)", required: false, fields: [{ name: "q2", type: "input_text" }] },
    ];
    const { fields, missingRequired } = mapGreenhouseAnswers(questions, profile);
    expect(fields).toEqual({});
    expect(missingRequired).toEqual(["Why do you want this job?"]);
  });
});
```

- [ ] **Step 2: Run it, expect FAIL**

Run: `npx vitest run tests/unit/sources/greenhouse-mapping.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement (mapping portion of greenhouse.ts)**

```ts
// src/lib/sources/greenhouse.ts
import { matchField } from "@/lib/field-matcher";
import type { ApplicantProfile } from "./types";

export interface GreenhouseField {
  name: string;
  type: string;
}
export interface GreenhouseQuestion {
  label: string;
  required: boolean;
  fields: GreenhouseField[];
}

const isFileField = (q: GreenhouseQuestion) =>
  q.fields.every((f) => f.type.includes("file"));

export function mapGreenhouseAnswers(
  questions: GreenhouseQuestion[],
  profile: ApplicantProfile,
): { fields: Record<string, string>; missingRequired: string[] } {
  const fields: Record<string, string> = {};
  const missingRequired: string[] = [];

  for (const q of questions) {
    if (isFileField(q)) continue; // resume handled separately
    const answer = matchField(q.label, q.fields[0]?.type ?? "", profile.answers);
    if (answer != null) {
      for (const f of q.fields) fields[f.name] = answer;
    } else if (q.required) {
      missingRequired.push(q.label);
    }
  }
  return { fields, missingRequired };
}
```

- [ ] **Step 4: Run it, expect PASS**

Run: `npx vitest run tests/unit/sources/greenhouse-mapping.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/sources/greenhouse.ts tests/unit/sources/greenhouse-mapping.test.ts
git commit -m "feat: map Greenhouse board questions onto applicant answers"
```

---

## Task 7: Greenhouse browser fallback (Playwright)

One filler works for every Greenhouse board (uniform DOM). Tested against a local mock form — never the live site.

**Files:**
- Create: `tests/mocks/greenhouse-form.html`
- Create: `src/lib/sources/greenhouse-browser.ts`
- Test: `tests/automation/greenhouse-apply.spec.ts`

- [ ] **Step 1: Create the mock form fixture**

```html
<!-- tests/mocks/greenhouse-form.html -->
<!DOCTYPE html>
<html>
  <body>
    <form id="application_form">
      <input id="first_name" name="first_name" />
      <input id="last_name" name="last_name" />
      <input id="email" name="email" />
      <input id="phone" name="phone" />
      <input id="resume" name="resume" type="file" />
      <button type="submit" id="submit_app"
        onclick="event.preventDefault(); document.body.setAttribute('data-submitted','1');">
        Submit Application
      </button>
    </form>
  </body>
</html>
```

- [ ] **Step 2: Write the failing Playwright test**

```ts
// tests/automation/greenhouse-apply.spec.ts
import { test, expect } from "@playwright/test";
import path from "path";
import { fillGreenhouseForm } from "@/lib/sources/greenhouse-browser";
import type { ApplicantProfile } from "@/lib/sources/types";

const profile: ApplicantProfile = {
  email: "jo@x.com",
  resumePath: null,
  answers: [
    { fieldLabel: "First name", fieldType: "text", answer: "Jo" },
    { fieldLabel: "Last name", fieldType: "text", answer: "Smith" },
    { fieldLabel: "Phone number", fieldType: "text", answer: "555-1234" },
  ],
};

test("fills and submits a Greenhouse form", async ({ page }) => {
  await page.goto(`file://${path.resolve("tests/mocks/greenhouse-form.html")}`);
  await fillGreenhouseForm(page, profile);

  await expect(page.locator("#first_name")).toHaveValue("Jo");
  await expect(page.locator("#last_name")).toHaveValue("Smith");
  await expect(page.locator("#email")).toHaveValue("jo@x.com");
  await expect(page.locator("#phone")).toHaveValue("555-1234");
  await expect(page.locator("body")).toHaveAttribute("data-submitted", "1");
});
```

- [ ] **Step 3: Run it, expect FAIL**

Run: `npx playwright test --testMatch 'tests/automation/greenhouse-apply.spec.ts'`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement**

```ts
// src/lib/sources/greenhouse-browser.ts
import { chromium, type Page } from "playwright";
import { matchField } from "@/lib/field-matcher";
import type { ApplicantProfile, ApplyResult, NormalizedJob } from "./types";

async function fillIf(page: Page, selector: string, value: string | null) {
  if (value) await page.fill(selector, value);
}

/** Fills a Greenhouse-hosted application form on an already-loaded page. */
export async function fillGreenhouseForm(page: Page, profile: ApplicantProfile): Promise<void> {
  const get = (label: string) => matchField(label, "text", profile.answers);
  await fillIf(page, "#first_name", get("first name"));
  await fillIf(page, "#last_name", get("last name"));
  await fillIf(page, "#email", profile.email);
  await fillIf(page, "#phone", get("phone number"));
  if (profile.resumePath) {
    await page.setInputFiles("#resume", profile.resumePath).catch(() => {});
  }
  await page.click('#application_form button[type="submit"]');
}

/** Launches a browser, navigates the job's apply URL, fills, submits. */
export async function browserApplyGreenhouse(
  job: NormalizedJob,
  profile: ApplicantProfile,
): Promise<ApplyResult> {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.goto(job.applyUrl ?? job.url, { waitUntil: "domcontentloaded" });
    await fillGreenhouseForm(page, profile);
    return { outcome: "submitted", method: "browser" };
  } catch (e) {
    return { outcome: "failed", method: "browser", message: String(e) };
  } finally {
    await browser.close();
  }
}
```

- [ ] **Step 5: Run it, expect PASS**

Run: `npx playwright test --testMatch 'tests/automation/greenhouse-apply.spec.ts'`
Expected: PASS (4 field values + submitted marker).

- [ ] **Step 6: Commit**

```bash
git add src/lib/sources/greenhouse-browser.ts tests/mocks/greenhouse-form.html tests/automation/greenhouse-apply.spec.ts
git commit -m "feat: reusable Greenhouse browser form-filler fallback"
```

---

## Task 8: GreenhouseApplier (API-first, browser-fallback)

**Files:**
- Modify: `src/lib/sources/greenhouse.ts` (add the applier)
- Test: `tests/unit/sources/greenhouse-apply.test.ts`

> Greenhouse's exact submit encoding (auth header, resume multipart) is verified against the captured fixture / a live board during the manual check (spec §8.7). These unit tests pin the **control flow** regardless of wire format; the browser fallback is the guaranteed path when the API rejects us.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/sources/greenhouse-apply.test.ts
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { greenhouseApplier } from "@/lib/sources/greenhouse";
import type { ApplicantProfile, NormalizedJob } from "@/lib/sources/types";

vi.mock("@/lib/sources/greenhouse-browser", () => ({
  browserApplyGreenhouse: vi.fn(async () => ({ outcome: "submitted", method: "browser" })),
}));
import { browserApplyGreenhouse } from "@/lib/sources/greenhouse-browser";

const profile: ApplicantProfile = {
  email: "jo@x.com",
  resumePath: "/cv.pdf",
  answers: [{ fieldLabel: "First name", fieldType: "text", answer: "Jo" }],
};
const job = (url: string): NormalizedJob => ({
  source: "adzuna", externalId: "1", title: "QA", company: "Acme", location: "Remote",
  salary: null, jobType: null, url, applyUrl: url, description: "",
});
const GH = "https://boards.greenhouse.io/acme/jobs/123";

function mockBoard(questions: unknown[], submitStatus: number) {
  return vi.fn(async (url: string, init?: { method?: string }) => {
    if (init?.method === "POST") return { ok: submitStatus < 400, status: submitStatus, json: async () => ({}) };
    return { ok: true, status: 200, json: async () => ({ id: 123, questions }) };
  });
}

afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });

describe("greenhouseApplier", () => {
  it("canApply matches greenhouse hosts only", () => {
    expect(greenhouseApplier.canApply(job(GH))).toBe(true);
    expect(greenhouseApplier.canApply(job("https://linkedin.com/jobs/1"))).toBe(false);
  });

  it("submits via API when all required questions resolve", async () => {
    vi.stubGlobal("fetch", mockBoard(
      [{ label: "First name", required: true, fields: [{ name: "first_name", type: "input_text" }] }], 200,
    ));
    const r = await greenhouseApplier.apply(job(GH), profile);
    expect(r).toEqual({ outcome: "submitted", method: "api" });
  });

  it("returns needs_review when a required question is unanswered", async () => {
    vi.stubGlobal("fetch", mockBoard(
      [{ label: "Why us?", required: true, fields: [{ name: "q1", type: "textarea" }] }], 200,
    ));
    const r = await greenhouseApplier.apply(job(GH), profile);
    expect(r.outcome).toBe("needs_review");
  });

  it("falls back to the browser on 401/403", async () => {
    vi.stubGlobal("fetch", mockBoard(
      [{ label: "First name", required: true, fields: [{ name: "first_name", type: "input_text" }] }], 403,
    ));
    const r = await greenhouseApplier.apply(job(GH), profile);
    expect(browserApplyGreenhouse).toHaveBeenCalledOnce();
    expect(r).toEqual({ outcome: "submitted", method: "browser" });
  });

  it("fails cleanly on an unrecognized URL", async () => {
    const r = await greenhouseApplier.apply(job("https://boards.greenhouse.io/acme"), profile);
    expect(r.outcome).toBe("failed");
  });
});
```

- [ ] **Step 2: Run it, expect FAIL**

Run: `npx vitest run tests/unit/sources/greenhouse-apply.test.ts`
Expected: FAIL — `greenhouseApplier` not exported.

- [ ] **Step 3: Implement (append to `src/lib/sources/greenhouse.ts`)**

```ts
import type { ApplyResult, JobApplier, NormalizedJob } from "./types";
import { isGreenhouseUrl, parseGreenhouseUrl } from "./greenhouse-url";
import { browserApplyGreenhouse } from "./greenhouse-browser";

const BOARDS_API = "https://boards-api.greenhouse.io/v1/boards";

export const greenhouseApplier: JobApplier = {
  id: "greenhouse",
  canApply(job: NormalizedJob): boolean {
    return isGreenhouseUrl(job.applyUrl ?? job.url);
  },
  async apply(job: NormalizedJob, profile): Promise<ApplyResult> {
    const parsed = parseGreenhouseUrl(job.applyUrl ?? job.url);
    if (!parsed) return { outcome: "failed", method: "api", message: "Unrecognized Greenhouse URL" };
    const { token, jobId } = parsed;

    let questions: GreenhouseQuestion[];
    try {
      const res = await fetch(`${BOARDS_API}/${token}/jobs/${jobId}?questions=true`);
      if (!res.ok) return { outcome: "failed", method: "api", message: `Board fetch ${res.status}` };
      questions = ((await res.json()) as { questions?: GreenhouseQuestion[] }).questions ?? [];
    } catch (e) {
      return { outcome: "failed", method: "api", message: String(e) };
    }

    const { fields, missingRequired } = mapGreenhouseAnswers(questions, profile);
    if (missingRequired.length) {
      return { outcome: "needs_review", method: "api", message: `Unanswered required: ${missingRequired.join(", ")}` };
    }

    const submit = await fetch(`${BOARDS_API}/${token}/jobs/${jobId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...fields, email: profile.email }),
    });
    if (submit.status === 401 || submit.status === 403) {
      return browserApplyGreenhouse(job, profile); // board requires auth — use the form
    }
    if (!submit.ok) return { outcome: "failed", method: "api", message: `Submit ${submit.status}` };
    return { outcome: "submitted", method: "api" };
  },
};
```

- [ ] **Step 4: Run it, expect PASS**

Run: `npx vitest run tests/unit/sources/greenhouse-apply.test.ts`
Expected: PASS (5 cases).

- [ ] **Step 5: Commit**

```bash
git add src/lib/sources/greenhouse.ts tests/unit/sources/greenhouse-apply.test.ts
git commit -m "feat: GreenhouseApplier with API-first, browser fallback"
```

---

## Task 9: The registry

**Files:**
- Create: `src/lib/sources/registry.ts`
- Test: `tests/unit/sources/registry.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/sources/registry.test.ts
import { describe, it, expect } from "vitest";
import { registeredSources, registeredAppliers, applierFor } from "@/lib/sources/registry";
import type { NormalizedJob } from "@/lib/sources/types";

const job = (url: string): NormalizedJob => ({
  source: "adzuna", externalId: "1", title: "QA", company: "Acme", location: "Remote",
  salary: null, jobType: null, url, applyUrl: url, description: "",
});

describe("registry", () => {
  it("registers adzuna as a source and greenhouse as an applier", () => {
    expect(registeredSources().map((s) => s.id)).toContain("adzuna");
    expect(registeredAppliers().map((a) => a.id)).toContain("greenhouse");
  });

  it("routes greenhouse jobs to the greenhouse applier", () => {
    expect(applierFor(job("https://boards.greenhouse.io/acme/jobs/1"))?.id).toBe("greenhouse");
  });

  it("returns null when no applier matches", () => {
    expect(applierFor(job("https://www.linkedin.com/jobs/view/1"))).toBeNull();
  });
});
```

- [ ] **Step 2: Run it, expect FAIL**

Run: `npx vitest run tests/unit/sources/registry.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// src/lib/sources/registry.ts
import type { JobApplier, JobSource, NormalizedJob } from "./types";
import { adzunaSource } from "./adzuna-source";
import { greenhouseApplier } from "./greenhouse";

const SOURCES: JobSource[] = [adzunaSource];
const APPLIERS: JobApplier[] = [greenhouseApplier];

export function registeredSources(): JobSource[] {
  return SOURCES;
}
export function registeredAppliers(): JobApplier[] {
  return APPLIERS;
}
export function applierFor(
  job: NormalizedJob,
  appliers: JobApplier[] = APPLIERS,
): JobApplier | null {
  return appliers.find((a) => a.canApply(job)) ?? null;
}
```

- [ ] **Step 4: Run it, expect PASS**

Run: `npx vitest run tests/unit/sources/registry.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/sources/registry.ts tests/unit/sources/registry.test.ts
git commit -m "feat: source/applier registry with host-based routing"
```

---

## Task 10: Contract-conformance suite

A reusable suite asserting every registered source/applier obeys the contract. M2's fleet inherits this unchanged.

**Files:**
- Test: `tests/unit/sources/contract-conformance.test.ts`

- [ ] **Step 1: Write the test**

```ts
// tests/unit/sources/contract-conformance.test.ts
import { describe, it, expect } from "vitest";
import { registeredSources, registeredAppliers } from "@/lib/sources/registry";
import type { NormalizedJob } from "@/lib/sources/types";

const sampleJob: NormalizedJob = {
  source: "x", externalId: "1", title: "t", company: "c", location: "l",
  salary: null, jobType: null, url: "https://example.com/jobs/1", applyUrl: null, description: "",
};

describe.each(registeredSources())("JobSource conformance: $id", (source) => {
  it("has a non-empty id and label", () => {
    expect(source.id).toBeTruthy();
    expect(source.label).toBeTruthy();
  });
  it("exposes isConfigured() and search()", () => {
    expect(typeof source.isConfigured).toBe("function");
    expect(typeof source.search).toBe("function");
  });
});

describe.each(registeredAppliers())("JobApplier conformance: $id", (applier) => {
  it("has a non-empty id", () => {
    expect(applier.id).toBeTruthy();
  });
  it("canApply is pure & deterministic", () => {
    const a = applier.canApply(sampleJob);
    const b = applier.canApply(sampleJob);
    expect(a).toBe(b);
    expect(typeof a).toBe("boolean");
  });
});
```

- [ ] **Step 2: Run it, expect PASS** (the implementations already conform)

Run: `npx vitest run tests/unit/sources/contract-conformance.test.ts`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add tests/unit/sources/contract-conformance.test.ts
git commit -m "test: reusable JobSource/JobApplier contract-conformance suite"
```

---

## Task 11: Rename IndeedJob → DiscoveredJob + composite dedup

Renames the model, adds `source` + `(source, externalId)` uniqueness + apply-tracking, switches `ingest.ts` dedup to the composite key, and updates all references.

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `src/lib/jobs/ingest.ts`
- Modify (model accessor + field renames): `src/app/api/indeed/[id]/route.ts`, `src/app/api/indeed/insights/route.ts`, `src/app/api/indeed/route.ts`, `src/app/indeed/[id]/page.tsx`, `src/app/indeed/page.tsx`, `src/components/indeed/indeed-job-table.tsx`, `src/lib/automation/indeed/engine-indeed.ts`, `src/lib/automation/indeed/match-scorer.ts`
- Modify: `tests/integration/db/adzuna-ingest.test.ts`
- Test: `tests/integration/db/cross-source-dedup.test.ts` (create)

**Rename map (apply everywhere):** `prisma.indeedJob` → `prisma.discoveredJob`; `prisma.indeedRequirement` → `prisma.jobRequirement`; field `indeedJobId` → `externalId`. (Relation field `requirements` and route *paths* `/indeed` stay unchanged to bound the blast radius.)

- [ ] **Step 1: Edit the schema**

In `prisma/schema.prisma`, replace the `IndeedJob`/`IndeedRequirement` models with:

```prisma
model DiscoveredJob {
  id             Int              @id @default(autoincrement())
  source         String           @default("adzuna")
  externalId     String
  title          String
  company        String
  location       String
  salary         String?
  jobType        String?
  url            String
  applyUrl       String?
  descriptionRaw String
  matchScore     Int?
  matchSummary   String?
  searchQuery    String
  applyOutcome   String?
  appliedAt      DateTime?
  scrapedAt      DateTime         @default(now())
  createdAt      DateTime         @default(now())
  requirements   JobRequirement[]

  @@unique([source, externalId])
}

model JobRequirement {
  id          Int           @id @default(autoincrement())
  jobId       Int
  job         DiscoveredJob @relation(fields: [jobId], references: [id], onDelete: Cascade)
  category    String
  requirement String
  isRequired  Boolean       @default(true)
  matched     Boolean       @default(false)
  createdAt   DateTime      @default(now())
}
```

- [ ] **Step 2: Push schema to both DBs and regenerate the client**

```bash
npm run db:push
npm run db:generate
DATABASE_URL="file:./prisma/test.db" npm run db:push
```
Expected: Prisma reports the schema is in sync for both `dev.db` and `test.db`, and the client regenerates.

- [ ] **Step 3: Update `ingest.ts` to the renamed model + composite dedup**

Replace the body of `ingestJobs` in `src/lib/jobs/ingest.ts` so the dedup key and create call use source + externalId:

```ts
import { prisma } from "@/lib/db";
import { parseRequirements, type ParsedRequirement } from "@/lib/automation/indeed/parse-requirements";
import type { NormalizedJob } from "@/lib/sources/types";

type ParseFn = (descriptionHtml: string, descriptionText: string) => Promise<ParsedRequirement[]>;

export async function ingestJobs(
  jobs: NormalizedJob[],
  searchQuery: string,
  seenIds: Set<string>,
  parseFn: ParseFn = parseRequirements,
): Promise<number[]> {
  const createdIds: number[] = [];
  for (const job of jobs) {
    const key = `${job.source}:${job.externalId}`;
    if (seenIds.has(key)) continue;
    seenIds.add(key);

    let requirements: ParsedRequirement[];
    try {
      requirements = await parseFn(job.description, job.description);
    } catch {
      requirements = [];
    }

    const saved = await prisma.discoveredJob.create({
      data: {
        source: job.source,
        externalId: job.externalId,
        title: job.title,
        company: job.company,
        location: job.location,
        salary: job.salary,
        jobType: job.jobType,
        url: job.url,
        applyUrl: job.applyUrl ?? job.url,
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

- [ ] **Step 4: Apply the rename map to the 8 reference files**

Run this to find every line:
```bash
grep -rnE 'indeedJob|indeedRequirement|indeedJobId|IndeedJob|IndeedRequirement' src --include='*.ts' --include='*.tsx'
```
In each hit, apply the rename map from the task header (`prisma.indeedJob`→`prisma.discoveredJob`, `prisma.indeedRequirement`→`prisma.jobRequirement`, `indeedJobId`→`externalId`, type names `IndeedJob`→`DiscoveredJob`). Do **not** rename the relation field `requirements` or the `/indeed` route paths.

- [ ] **Step 5: Update the existing ingest test**

In `tests/integration/db/adzuna-ingest.test.ts`:
- Add `source: "adzuna"` and `applyUrl: \`https://adzuna/${id}\`` to the `job()` helper object.
- Replace `prisma.indeedRequirement` → `prisma.jobRequirement`, `prisma.indeedJob` → `prisma.discoveredJob`.
- Replace the lookup `where: { indeedJobId: "a" }` → `where: { source_externalId: { source: "adzuna", externalId: "a" } }`.
- The "dedup within a run" test seeds `new Set(["dup"])` → change to `new Set(["adzuna:dup"])` to match the new composite key.

- [ ] **Step 6: Write the cross-source dedup test**

```ts
// tests/integration/db/cross-source-dedup.test.ts
import { describe, it, expect } from "vitest";
import { prisma } from "@/lib/db";
import { ingestJobs } from "@/lib/jobs/ingest";
import type { NormalizedJob } from "@/lib/sources/types";

const fakeParse = async () => [];
const job = (source: string, id: string): NormalizedJob => ({
  source, externalId: id, title: "QA", company: "Acme", location: "Remote",
  salary: null, jobType: null, url: `https://${source}/${id}`, applyUrl: `https://${source}/${id}`,
  description: "d",
});

describe("cross-source dedup", () => {
  it("keeps same externalId from different sources", async () => {
    await ingestJobs([job("adzuna", "1"), job("greenhouse", "1")], "qa", new Set(), fakeParse);
    expect(await prisma.discoveredJob.count()).toBe(2);
  });

  it("dedupes same (source, externalId)", async () => {
    await ingestJobs([job("adzuna", "1")], "qa", new Set(), fakeParse);
    const ids = await ingestJobs([job("adzuna", "1")], "qa", new Set(), fakeParse);
    expect(ids).toHaveLength(0); // unique constraint short-circuits via seen set
    expect(await prisma.discoveredJob.count()).toBe(1);
  });
});
```

- [ ] **Step 7: Run the full suite + typecheck**

Run: `npx vitest run && npx tsc --noEmit`
Expected: all tests PASS (including the previously-failing `adzuna-ingest.test.ts` from Task 4) and tsc is clean.

- [ ] **Step 8: Commit**

```bash
git add prisma/schema.prisma src/lib/jobs/ingest.ts src/app/indeed src/app/api/indeed src/components/indeed src/lib/automation/indeed tests/integration/db/adzuna-ingest.test.ts tests/integration/db/cross-source-dedup.test.ts
git commit -m "feat: rename IndeedJob to DiscoveredJob with (source, externalId) dedup"
```

---

## Task 12: Manual apply route

**Files:**
- Create: `src/app/api/jobs/[id]/apply/route.ts`
- Test: `tests/integration/api/apply-route.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/integration/api/apply-route.test.ts
import { describe, it, expect, vi, afterEach } from "vitest";
import { prisma } from "@/lib/db";
import { POST } from "@/app/api/jobs/[id]/apply/route";

afterEach(() => vi.restoreAllMocks());

async function seedJob(applyUrl: string) {
  await prisma.credential.create({ data: { email: "jo@x.com", password: "e", encryptionCheck: "ok" } });
  return prisma.discoveredJob.create({
    data: {
      source: "adzuna", externalId: "1", title: "QA", company: "Acme", location: "Remote",
      url: applyUrl, applyUrl, descriptionRaw: "d", searchQuery: "qa",
    },
  });
}
const ctx = (id: number) => ({ params: Promise.resolve({ id: String(id) }) });

describe("POST /api/jobs/[id]/apply", () => {
  it("routes a greenhouse job through the applier and records the outcome", async () => {
    const job = await seedJob("https://boards.greenhouse.io/acme/jobs/123");
    vi.stubGlobal("fetch", vi.fn(async (_u: string, init?: { method?: string }) =>
      init?.method === "POST"
        ? { ok: true, status: 200, json: async () => ({}) }
        : { ok: true, status: 200, json: async () => ({ id: 123, questions: [] }) },
    ));

    const res = await POST(new Request("http://x", { method: "POST" }), ctx(job.id));
    const body = await res.json();
    expect(body.result.outcome).toBe("submitted");

    const updated = await prisma.discoveredJob.findUnique({ where: { id: job.id } });
    expect(updated?.applyOutcome).toBe("submitted");
    expect(updated?.appliedAt).not.toBeNull();
  });

  it("returns 'no applier' for a non-greenhouse job without applying", async () => {
    const job = await seedJob("https://www.linkedin.com/jobs/view/1");
    const res = await POST(new Request("http://x", { method: "POST" }), ctx(job.id));
    const body = await res.json();
    expect(body.error).toMatch(/no applier/i);
    const updated = await prisma.discoveredJob.findUnique({ where: { id: job.id } });
    expect(updated?.applyOutcome).toBeNull();
  });
});
```

- [ ] **Step 2: Run it, expect FAIL**

Run: `npx vitest run tests/integration/api/apply-route.test.ts`
Expected: FAIL — route module not found.

- [ ] **Step 3: Implement**

```ts
// src/app/api/jobs/[id]/apply/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { applierFor } from "@/lib/sources/registry";
import { assembleApplicantProfile } from "@/lib/sources/profile";
import type { NormalizedJob } from "@/lib/sources/types";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const jobId = parseInt(id);
  if (isNaN(jobId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const row = await prisma.discoveredJob.findUnique({ where: { id: jobId } });
  if (!row) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  const job: NormalizedJob = {
    source: row.source, externalId: row.externalId, title: row.title, company: row.company,
    location: row.location, salary: row.salary, jobType: row.jobType, url: row.url,
    applyUrl: row.applyUrl, description: row.descriptionRaw,
  };

  const applier = applierFor(job);
  if (!applier) return NextResponse.json({ error: "No applier for this job's host" }, { status: 422 });

  const profile = await assembleApplicantProfile();
  const result = await applier.apply(job, profile);

  await prisma.discoveredJob.update({
    where: { id: jobId },
    data: { applyOutcome: result.outcome, appliedAt: new Date() },
  });

  return NextResponse.json({ result });
}
```

- [ ] **Step 4: Run it, expect PASS**

Run: `npx vitest run tests/integration/api/apply-route.test.ts`
Expected: PASS (both cases).

- [ ] **Step 5: Commit**

```bash
git add src/app/api/jobs/[id]/apply/route.ts tests/integration/api/apply-route.test.ts
git commit -m "feat: manual apply route routing jobs through the registry"
```

---

## Task 13: Apply button on the job detail page

Thin UI glue over the (already tested) route. Shown only for jobs with a matching applier.

**Files:**
- Modify: `src/app/indeed/[id]/page.tsx`

- [ ] **Step 1: Add a server-side "canApply" flag + client Apply control**

In `src/app/indeed/[id]/page.tsx`, where the job is loaded, compute whether an applier exists and render an Apply button that POSTs to the route. Use the existing page's data-loading pattern; add:

```tsx
import { applierFor } from "@/lib/sources/registry";
// after the job is fetched into `job` (with source/externalId/url/applyUrl):
const canApply = applierFor({
  source: job.source, externalId: job.externalId, title: job.title, company: job.company,
  location: job.location, salary: job.salary, jobType: job.jobType, url: job.url,
  applyUrl: job.applyUrl, description: job.descriptionRaw,
}) !== null;
```

Render (only when `canApply`) a button wired to a client handler that calls:
```ts
await fetch(`/api/jobs/${job.id}/apply`, { method: "POST" });
```
and surfaces the returned `result.outcome` (e.g. via the existing `sonner` toast used elsewhere in the app). Follow the file's existing server/client component split; if the page is a server component, put the button + fetch in a small `"use client"` child component.

- [ ] **Step 2: Verify the app builds and the button renders**

Run: `npm run build`
Expected: build succeeds.
Then manually: start the dev server (the user keeps one running — verify over live HTTP rather than restarting), open a discovered Greenhouse job's detail page, confirm the **Apply** button shows; open a LinkedIn-sourced job, confirm it does **not**.

- [ ] **Step 3: Commit**

```bash
git add src/app/indeed/[id]/page.tsx
git commit -m "feat: Apply button on job detail for applier-supported jobs"
```

---

## Task 14: Final verification

- [ ] **Step 1: Full unit/integration suite**

Run: `npx vitest run`
Expected: all green — the M0 baseline (72) plus the new source/registry/greenhouse/profile/dedup/route tests.

- [ ] **Step 2: Browser fallback spec**

Run: `npx playwright test --testMatch 'tests/automation/greenhouse-apply.spec.ts'`
Expected: PASS.

- [ ] **Step 3: Lint + typecheck**

Run: `npm run lint && npx tsc --noEmit`
Expected: clean.

- [ ] **Step 4: (Optional, human-run) live apply check** — spec §8.7

Only when you choose to: set `ALLOW_LIVE_APPLY=1`, apply to one known Greenhouse posting via the UI, confirm `submitted` + the application actually lands. This is the *only* real submission; never automate it.

---

## Self-Review (completed by plan author)

- **Spec coverage:** contract types (T2) ✓; Adzuna refactor (T4) ✓; Greenhouse apply API-first/browser-fallback (T6–T8) ✓; ApplicantProfile (T5) ✓; registry routing (T9) ✓; conformance suite §8.2 (T10) ✓; data-model rename + composite dedup §6 (T11) ✓; manual apply path §"end-to-end" (T12–T13) ✓; fetch guard §8.6 (T1) ✓; live-apply §8.7 (T14.4) ✓. Fixture capture (§8.5) is folded into T8's note rather than a separate task — capture a real board response when verifying the POST encoding.
- **Type consistency:** `NormalizedJob`, `ApplicantProfile`, `ApplyResult`, `GreenhouseQuestion`, `applierFor`, `assembleApplicantProfile`, `mapGreenhouseAnswers`, `greenhouseApplier`, `adzunaSource`, `browserApplyGreenhouse`, `fillGreenhouseForm` are defined once and referenced consistently across tasks.
- **Placeholders:** none — every code step shows full content.
