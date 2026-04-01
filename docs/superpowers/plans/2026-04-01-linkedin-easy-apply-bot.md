# LinkedIn Easy Apply Bot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a fully automatic LinkedIn Easy Apply bot with a Next.js dashboard, Playwright browser automation, SQLite storage, and comprehensive testing.

**Architecture:** Next.js App Router serves both the dashboard UI and API routes. A Playwright-based automation engine runs in a background process, controlled via the API. SQLite (via Prisma) stores jobs, configs, credentials, and logs. Structured JSON log files on disk provide AI-friendly analysis.

**Tech Stack:** Next.js 14, React, Tailwind CSS, shadcn/ui, Playwright, Prisma + SQLite, Vitest, TypeScript

---

## File Structure

```
linkedin/
  src/
    app/
      layout.tsx
      page.tsx
      jobs/page.tsx
      review/page.tsx
      config/page.tsx
      automation/page.tsx
      logs/page.tsx
      api/
        jobs/route.ts
        config/route.ts
        config/profile-answers/route.ts
        session/route.ts
        automation/route.ts
        logs/route.ts
      globals.css
    components/
      ui/
      sidebar.tsx
      dashboard/
        stats-cards.tsx
        applications-chart.tsx
        status-badge.tsx
      jobs/
        job-table.tsx
        job-filters.tsx
      config/
        search-config-form.tsx
        profile-answers-form.tsx
        credentials-form.tsx
      automation/
        status-indicator.tsx
        control-buttons.tsx
      logs/
        log-viewer.tsx
        log-filters.tsx
    lib/
      db.ts
      automation/
        engine.ts
        login.ts
        search.ts
        apply.ts
        form-filler.ts
        dropdown-handler.ts
        screenshot.ts
        state.ts
      logging/
        logger.ts
        log-reader.ts
      encryption/
        crypto.ts
      filter-builder.ts
      field-matcher.ts
      data-parser.ts
      dedup.ts
  prisma/
    schema.prisma
  tests/
    unit/
      field-matcher.test.ts
      dropdown-handler.test.ts
      dedup.test.ts
      encryption.test.ts
      log-formatter.test.ts
      filter-builder.test.ts
      data-parser.test.ts
    integration/
      api/
        jobs.test.ts
        config.test.ts
        automation.test.ts
        logs.test.ts
      db/
        job-operations.test.ts
        profile-answers.test.ts
    e2e/
      dashboard.spec.ts
      configuration.spec.ts
      job-list.spec.ts
      automation-control.spec.ts
      log-viewer.spec.ts
    automation/
      login-flow.spec.ts
      easy-apply-flow.spec.ts
      skip-flow.spec.ts
      error-recovery.spec.ts
    mocks/
      linkedin-login.html
      easy-apply-single-step.html
      easy-apply-multi-step.html
      easy-apply-with-dropdowns.html
      easy-apply-unknown-fields.html
  cookies/
  logs/
  screenshots/
  .env.example
  .env
  .gitignore
  next.config.ts
  tailwind.config.ts
  vitest.config.ts
  playwright.config.ts
  package.json
  tsconfig.json
```

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `vitest.config.ts`, `playwright.config.ts`, `.env.example`, `.env`, `.gitignore`, `src/app/globals.css`, `src/app/layout.tsx`, `src/app/page.tsx`

- [ ] **Step 1: Initialize Next.js project with dependencies**

```bash
cd /Users/jason/Desktop/linkedin
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --no-turbopack
```

- [ ] **Step 2: Install core dependencies**

```bash
npm install prisma @prisma/client playwright @playwright/test better-sqlite3 recharts lucide-react date-fns zod
npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom jsdom
```

- [ ] **Step 3: Install shadcn/ui**

```bash
npx shadcn@latest init -d
npx shadcn@latest add button card table input select badge dialog tabs label textarea separator switch scroll-area dropdown-menu toast sheet
```

- [ ] **Step 4: Create vitest.config.ts**

```ts
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: [],
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

- [ ] **Step 5: Create playwright.config.ts**

```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  testMatch: ["e2e/**/*.spec.ts", "automation/**/*.spec.ts"],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
  },
});
```

- [ ] **Step 6: Create .env.example and .env**

`.env.example`:
```
DATABASE_URL="file:./dev.db"
ENCRYPTION_KEY="your-32-byte-hex-key-here"
```

`.env`:
```
DATABASE_URL="file:./dev.db"
ENCRYPTION_KEY="change-me-to-a-random-32-byte-hex-string"
```

- [ ] **Step 7: Update .gitignore**

Append to the existing `.gitignore`:

```
# App-specific
cookies/
logs/
screenshots/
.env
prisma/dev.db
prisma/dev.db-journal
```

- [ ] **Step 8: Create directory placeholders**

```bash
mkdir -p cookies logs screenshots
touch cookies/.gitkeep logs/.gitkeep screenshots/.gitkeep
```

- [ ] **Step 9: Add scripts to package.json**

Add to the `"scripts"` section of `package.json`:

```json
{
  "test": "vitest run",
  "test:watch": "vitest",
  "test:e2e": "playwright test --testMatch 'tests/e2e/**/*.spec.ts'",
  "test:automation": "playwright test --testMatch 'tests/automation/**/*.spec.ts'",
  "db:push": "prisma db push",
  "db:studio": "prisma studio",
  "db:generate": "prisma generate"
}
```

- [ ] **Step 10: Verify project builds**

```bash
npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js project with all dependencies and config"
```

---

### Task 2: Prisma Schema + Database Setup

**Files:**
- Create: `prisma/schema.prisma`, `src/lib/db.ts`

- [ ] **Step 1: Create Prisma schema**

`prisma/schema.prisma`:
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model Job {
  id            Int      @id @default(autoincrement())
  linkedinJobId String   @unique
  title         String
  company       String
  location      String
  url           String
  status        String
  skipReason    String?
  appliedAt     DateTime @default(now())
  searchQuery   String
  createdAt     DateTime @default(now())
}

model SearchConfig {
  id               Int      @id @default(autoincrement())
  keywords         String
  location         String
  remotePreference String   @default("any")
  experienceLevel  String   @default("senior")
  datePosted       String   @default("past_24_hours")
  isActive         Boolean  @default(true)
  createdAt        DateTime @default(now())
}

model ProfileAnswer {
  id         Int      @id @default(autoincrement())
  fieldLabel String
  fieldType  String
  answer     String
  createdAt  DateTime @default(now())
}

model Credential {
  id              Int    @id @default(autoincrement())
  email           String
  password        String
  encryptionCheck String
}

model AutomationLog {
  id        Int      @id @default(autoincrement())
  timestamp DateTime @default(now())
  action    String
  jobId     String?
  jobTitle  String?
  company   String?
  jobUrl    String?
  reason    String?
  details   String?
  screenshot String?
  durationMs Int?
}
```

- [ ] **Step 2: Create Prisma client singleton**

`src/lib/db.ts`:
```ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

- [ ] **Step 3: Generate Prisma client and push schema**

```bash
npx prisma generate
npx prisma db push
```

Expected: `Your database is now in sync with your Prisma schema.`

- [ ] **Step 4: Verify Prisma works**

```bash
npx prisma studio
```

Expected: Opens browser showing empty tables. Close it after verifying.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma src/lib/db.ts
git commit -m "feat: add Prisma schema with Job, SearchConfig, ProfileAnswer, Credential, AutomationLog models"
```

---

### Task 3: Encryption Module

**Files:**
- Create: `src/lib/encryption/crypto.ts`, `tests/unit/encryption.test.ts`

- [ ] **Step 1: Write the failing tests**

`tests/unit/encryption.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { encrypt, decrypt } from "@/lib/encryption/crypto";

describe("encryption/crypto", () => {
  const key = "a".repeat(64);

  it("encrypts and decrypts a string round-trip", () => {
    const plaintext = "my-secret-password";
    const encrypted = encrypt(plaintext, key);
    expect(encrypted).not.toBe(plaintext);
    const decrypted = decrypt(encrypted, key);
    expect(decrypted).toBe(plaintext);
  });

  it("produces different ciphertext for same plaintext (random IV)", () => {
    const plaintext = "same-input";
    const a = encrypt(plaintext, key);
    const b = encrypt(plaintext, key);
    expect(a).not.toBe(b);
  });

  it("fails to decrypt with wrong key", () => {
    const plaintext = "secret";
    const encrypted = encrypt(plaintext, key);
    const wrongKey = "b".repeat(64);
    expect(() => decrypt(encrypted, wrongKey)).toThrow();
  });

  it("handles empty string", () => {
    const encrypted = encrypt("", key);
    const decrypted = decrypt(encrypted, key);
    expect(decrypted).toBe("");
  });

  it("handles unicode characters", () => {
    const plaintext = "p@$$w0rd!";
    const encrypted = encrypt(plaintext, key);
    const decrypted = decrypt(encrypted, key);
    expect(decrypted).toBe(plaintext);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/unit/encryption.test.ts
```

Expected: FAIL - module not found.

- [ ] **Step 3: Implement encryption module**

`src/lib/encryption/crypto.ts`:
```ts
import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;

export function encrypt(plaintext: string, hexKey: string): string {
  const key = Buffer.from(hexKey, "hex");
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [
    iv.toString("base64"),
    tag.toString("base64"),
    encrypted.toString("base64"),
  ].join(":");
}

export function decrypt(encryptedStr: string, hexKey: string): string {
  const key = Buffer.from(hexKey, "hex");
  const [ivB64, tagB64, dataB64] = encryptedStr.split(":");
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const encrypted = Buffer.from(dataB64, "base64");
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/unit/encryption.test.ts
```

Expected: All 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/encryption/crypto.ts tests/unit/encryption.test.ts
git commit -m "feat: add AES-256-GCM encryption module with tests"
```

---

### Task 4: Structured Logger

**Files:**
- Create: `src/lib/logging/logger.ts`, `src/lib/logging/log-reader.ts`, `tests/unit/log-formatter.test.ts`

- [ ] **Step 1: Write the failing tests**

`tests/unit/log-formatter.test.ts`:
```ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import { AutomationLogger } from "@/lib/logging/logger";
import { readLogs } from "@/lib/logging/log-reader";

const TEST_LOG_DIR = path.join(process.cwd(), "tests", "tmp-logs");

describe("AutomationLogger", () => {
  let logger: AutomationLogger;

  beforeEach(() => {
    fs.mkdirSync(TEST_LOG_DIR, { recursive: true });
    logger = new AutomationLogger(TEST_LOG_DIR);
  });

  afterEach(() => {
    fs.rmSync(TEST_LOG_DIR, { recursive: true, force: true });
  });

  it("writes a valid JSONL entry", () => {
    logger.log({
      action: "apply_success",
      job: {
        linkedinJobId: "123",
        title: "QA Engineer",
        company: "Acme",
        url: "https://linkedin.com/jobs/view/123",
      },
    });

    const files = fs.readdirSync(TEST_LOG_DIR);
    expect(files).toHaveLength(1);
    expect(files[0]).toMatch(/^automation-\d{4}-\d{2}-\d{2}\.jsonl$/);

    const content = fs.readFileSync(path.join(TEST_LOG_DIR, files[0]), "utf8");
    const lines = content.trim().split("\n");
    expect(lines).toHaveLength(1);

    const entry = JSON.parse(lines[0]);
    expect(entry.action).toBe("apply_success");
    expect(entry.job.company).toBe("Acme");
    expect(entry.timestamp).toBeDefined();
  });

  it("appends multiple entries to the same file", () => {
    logger.log({ action: "automation_start" });
    logger.log({ action: "search_start", details: { query: "SDET" } });
    logger.log({ action: "automation_stop" });

    const files = fs.readdirSync(TEST_LOG_DIR);
    const content = fs.readFileSync(path.join(TEST_LOG_DIR, files[0]), "utf8");
    const lines = content.trim().split("\n");
    expect(lines).toHaveLength(3);
  });

  it("includes optional fields when provided", () => {
    logger.log({
      action: "apply_skip",
      job: {
        linkedinJobId: "456",
        title: "SDET",
        company: "TechCo",
        url: "https://linkedin.com/jobs/view/456",
      },
      reason: "unknown_required_field",
      details: { fieldLabel: "Cover letter", fieldType: "textarea" },
      screenshot: "screenshots/test.png",
      durationMs: 5000,
    });

    const files = fs.readdirSync(TEST_LOG_DIR);
    const content = fs.readFileSync(path.join(TEST_LOG_DIR, files[0]), "utf8");
    const entry = JSON.parse(content.trim());
    expect(entry.reason).toBe("unknown_required_field");
    expect(entry.screenshot).toBe("screenshots/test.png");
    expect(entry.durationMs).toBe(5000);
  });
});

describe("readLogs", () => {
  beforeEach(() => {
    fs.mkdirSync(TEST_LOG_DIR, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(TEST_LOG_DIR, { recursive: true, force: true });
  });

  it("reads and parses JSONL log files", () => {
    const e1 = JSON.stringify({ timestamp: "2026-04-01T10:00:00Z", action: "apply_success" });
    const e2 = JSON.stringify({ timestamp: "2026-04-01T10:01:00Z", action: "apply_skip" });
    fs.writeFileSync(path.join(TEST_LOG_DIR, "automation-2026-04-01.jsonl"), `${e1}\n${e2}\n`);

    const logs = readLogs(TEST_LOG_DIR);
    expect(logs).toHaveLength(2);
    expect(logs[0].action).toBe("apply_success");
  });

  it("filters by action type", () => {
    const e1 = JSON.stringify({ timestamp: "2026-04-01T10:00:00Z", action: "apply_success" });
    const e2 = JSON.stringify({ timestamp: "2026-04-01T10:01:00Z", action: "apply_skip" });
    fs.writeFileSync(path.join(TEST_LOG_DIR, "automation-2026-04-01.jsonl"), `${e1}\n${e2}\n`);

    const logs = readLogs(TEST_LOG_DIR, { action: "apply_skip" });
    expect(logs).toHaveLength(1);
    expect(logs[0].action).toBe("apply_skip");
  });

  it("returns empty array when no log files exist", () => {
    const logs = readLogs(TEST_LOG_DIR);
    expect(logs).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/unit/log-formatter.test.ts
```

Expected: FAIL - modules not found.

- [ ] **Step 3: Implement the logger**

`src/lib/logging/logger.ts`:
```ts
import fs from "fs";
import path from "path";

export interface LogJob {
  linkedinJobId: string;
  title: string;
  company: string;
  url: string;
}

export interface LogEntry {
  timestamp: string;
  action: string;
  job?: LogJob;
  reason?: string;
  details?: Record<string, unknown>;
  screenshot?: string;
  durationMs?: number;
}

export type LogInput = Omit<LogEntry, "timestamp">;

export class AutomationLogger {
  private logDir: string;

  constructor(logDir?: string) {
    this.logDir = logDir ?? path.join(process.cwd(), "logs");
    fs.mkdirSync(this.logDir, { recursive: true });
  }

  log(input: LogInput): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      ...input,
    };
    const date = new Date().toISOString().split("T")[0];
    const filename = `automation-${date}.jsonl`;
    const filepath = path.join(this.logDir, filename);
    fs.appendFileSync(filepath, JSON.stringify(entry) + "\n");
    return entry;
  }
}
```

- [ ] **Step 4: Implement the log reader**

`src/lib/logging/log-reader.ts`:
```ts
import fs from "fs";
import path from "path";
import { LogEntry } from "./logger";

export interface LogFilter {
  action?: string;
  date?: string;
}

export function readLogs(logDir?: string, filter?: LogFilter): LogEntry[] {
  const dir = logDir ?? path.join(process.cwd(), "logs");

  if (!fs.existsSync(dir)) return [];

  const files = fs
    .readdirSync(dir)
    .filter((f) => f.startsWith("automation-") && f.endsWith(".jsonl"))
    .sort();

  if (filter?.date) {
    const target = `automation-${filter.date}.jsonl`;
    const filtered = files.filter((f) => f === target);
    return parseFiles(dir, filtered, filter);
  }

  return parseFiles(dir, files, filter);
}

function parseFiles(dir: string, files: string[], filter?: LogFilter): LogEntry[] {
  const entries: LogEntry[] = [];

  for (const file of files) {
    const content = fs.readFileSync(path.join(dir, file), "utf8");
    const lines = content.trim().split("\n").filter(Boolean);

    for (const line of lines) {
      const entry: LogEntry = JSON.parse(line);
      if (filter?.action && entry.action !== filter.action) continue;
      entries.push(entry);
    }
  }

  return entries;
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npx vitest run tests/unit/log-formatter.test.ts
```

Expected: All 6 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/logging/ tests/unit/log-formatter.test.ts
git commit -m "feat: add structured JSONL logger and log reader with tests"
```

---

### Task 5: Filter Builder

**Files:**
- Create: `src/lib/filter-builder.ts`, `tests/unit/filter-builder.test.ts`

- [ ] **Step 1: Write the failing tests**

`tests/unit/filter-builder.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { buildSearchUrl, SearchParams } from "@/lib/filter-builder";

describe("buildSearchUrl", () => {
  it("builds a basic search URL with keywords", () => {
    const params: SearchParams = { keywords: "QA Engineer" };
    const url = buildSearchUrl(params);
    expect(url).toContain("linkedin.com/jobs/search");
    expect(url).toContain("keywords=QA+Engineer");
    expect(url).toContain("f_AL=true");
  });

  it("includes location when provided", () => {
    const params: SearchParams = { keywords: "SDET", location: "New York" };
    const url = buildSearchUrl(params);
    expect(url).toContain("location=New+York");
  });

  it("maps remote preference to f_WT param", () => {
    expect(buildSearchUrl({ keywords: "QA", remotePreference: "remote" })).toContain("f_WT=2");
    expect(buildSearchUrl({ keywords: "QA", remotePreference: "hybrid" })).toContain("f_WT=3");
    expect(buildSearchUrl({ keywords: "QA", remotePreference: "onsite" })).toContain("f_WT=1");
  });

  it("does not include f_WT when preference is any", () => {
    const url = buildSearchUrl({ keywords: "QA", remotePreference: "any" });
    expect(url).not.toContain("f_WT");
  });

  it("maps datePosted to f_TPR param", () => {
    expect(buildSearchUrl({ keywords: "QA", datePosted: "past_24_hours" })).toContain("f_TPR=r86400");
    expect(buildSearchUrl({ keywords: "QA", datePosted: "past_week" })).toContain("f_TPR=r604800");
    expect(buildSearchUrl({ keywords: "QA", datePosted: "past_month" })).toContain("f_TPR=r2592000");
  });

  it("maps experienceLevel to f_E param", () => {
    expect(buildSearchUrl({ keywords: "QA", experienceLevel: "entry" })).toContain("f_E=2");
    expect(buildSearchUrl({ keywords: "QA", experienceLevel: "mid" })).toContain("f_E=3");
    expect(buildSearchUrl({ keywords: "QA", experienceLevel: "senior" })).toContain("f_E=4");
  });

  it("includes page offset for pagination", () => {
    const url = buildSearchUrl({ keywords: "QA" }, 2);
    expect(url).toContain("start=50");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/unit/filter-builder.test.ts
```

Expected: FAIL - module not found.

- [ ] **Step 3: Implement filter builder**

`src/lib/filter-builder.ts`:
```ts
export interface SearchParams {
  keywords: string;
  location?: string;
  remotePreference?: "remote" | "hybrid" | "onsite" | "any";
  experienceLevel?: "entry" | "mid" | "senior";
  datePosted?: "past_24_hours" | "past_week" | "past_month" | "any";
}

const REMOTE_MAP: Record<string, string> = {
  remote: "2",
  hybrid: "3",
  onsite: "1",
};

const DATE_MAP: Record<string, string> = {
  past_24_hours: "r86400",
  past_week: "r604800",
  past_month: "r2592000",
};

const EXPERIENCE_MAP: Record<string, string> = {
  entry: "2",
  mid: "3",
  senior: "4",
};

const RESULTS_PER_PAGE = 25;

export function buildSearchUrl(params: SearchParams, page: number = 0): string {
  const base = "https://www.linkedin.com/jobs/search/";
  const query = new URLSearchParams();

  query.set("keywords", params.keywords);
  query.set("f_AL", "true");

  if (params.location) {
    query.set("location", params.location);
  }

  if (params.remotePreference && params.remotePreference !== "any") {
    query.set("f_WT", REMOTE_MAP[params.remotePreference]);
  }

  if (params.datePosted && params.datePosted !== "any") {
    query.set("f_TPR", DATE_MAP[params.datePosted]);
  }

  if (params.experienceLevel) {
    query.set("f_E", EXPERIENCE_MAP[params.experienceLevel]);
  }

  if (page > 0) {
    query.set("start", String(page * RESULTS_PER_PAGE));
  }

  return `${base}?${query.toString()}`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/unit/filter-builder.test.ts
```

Expected: All 7 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/filter-builder.ts tests/unit/filter-builder.test.ts
git commit -m "feat: add LinkedIn search URL builder with tests"
```

---

### Task 6: Field Matcher

**Files:**
- Create: `src/lib/field-matcher.ts`, `tests/unit/field-matcher.test.ts`

- [ ] **Step 1: Write the failing tests**

`tests/unit/field-matcher.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { matchField, ProfileAnswerRecord } from "@/lib/field-matcher";

const answers: ProfileAnswerRecord[] = [
  { fieldLabel: "Phone number", fieldType: "text", answer: "555-123-4567" },
  { fieldLabel: "Years of experience", fieldType: "select", answer: "8" },
  { fieldLabel: "Work authorization", fieldType: "radio", answer: "Yes" },
  { fieldLabel: "Website", fieldType: "text", answer: "https://jason-tur.com/" },
  { fieldLabel: "LinkedIn profile", fieldType: "text", answer: "https://linkedin.com/in/jason" },
];

describe("matchField", () => {
  it("matches exact label", () => {
    expect(matchField("Phone number", "text", answers)).toBe("555-123-4567");
  });

  it("matches case-insensitive", () => {
    expect(matchField("phone number", "text", answers)).toBe("555-123-4567");
  });

  it("matches partial label (contains)", () => {
    expect(matchField("Your phone number", "text", answers)).toBe("555-123-4567");
  });

  it("matches years of experience variants", () => {
    expect(matchField("How many years of experience do you have?", "select", answers)).toBe("8");
    expect(matchField("Total years of relevant experience", "select", answers)).toBe("8");
  });

  it("matches website/portfolio variants", () => {
    expect(matchField("Portfolio URL", "text", answers)).toBe("https://jason-tur.com/");
    expect(matchField("Personal website", "text", answers)).toBe("https://jason-tur.com/");
  });

  it("returns null for unmatched fields", () => {
    expect(matchField("Describe your testing philosophy", "textarea", answers)).toBeNull();
  });

  it("matches work authorization variants", () => {
    expect(matchField("Are you authorized to work in the US?", "radio", answers)).toBe("Yes");
    expect(matchField("Do you require visa sponsorship?", "radio", answers)).toBe("Yes");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/unit/field-matcher.test.ts
```

Expected: FAIL - module not found.

- [ ] **Step 3: Implement field matcher**

`src/lib/field-matcher.ts`:
```ts
export interface ProfileAnswerRecord {
  fieldLabel: string;
  fieldType: string;
  answer: string;
}

const LABEL_ALIASES: Record<string, string[]> = {
  "phone number": ["phone", "mobile", "cell", "telephone", "contact number"],
  "years of experience": [
    "years of experience",
    "total years",
    "relevant experience",
    "how many years",
  ],
  website: ["portfolio", "personal website", "portfolio url", "website url", "your website"],
  "linkedin profile": ["linkedin url", "linkedin profile url"],
  "work authorization": [
    "authorized to work",
    "work authorization",
    "visa sponsorship",
    "legally authorized",
    "right to work",
    "require sponsorship",
  ],
};

function normalizeLabel(label: string): string {
  return label.toLowerCase().trim();
}

function findCanonicalLabel(inputLabel: string): string | null {
  const normalized = normalizeLabel(inputLabel);

  for (const [canonical, aliases] of Object.entries(LABEL_ALIASES)) {
    if (normalized.includes(canonical)) return canonical;
    for (const alias of aliases) {
      if (normalized.includes(alias)) return canonical;
    }
  }

  return null;
}

export function matchField(
  formLabel: string,
  formFieldType: string,
  answers: ProfileAnswerRecord[]
): string | null {
  const normalizedFormLabel = normalizeLabel(formLabel);

  // 1. Exact match (case-insensitive)
  for (const answer of answers) {
    if (normalizeLabel(answer.fieldLabel) === normalizedFormLabel) {
      return answer.answer;
    }
  }

  // 2. Contains match
  for (const answer of answers) {
    const answerLabel = normalizeLabel(answer.fieldLabel);
    if (normalizedFormLabel.includes(answerLabel) || answerLabel.includes(normalizedFormLabel)) {
      return answer.answer;
    }
  }

  // 3. Alias match
  const canonical = findCanonicalLabel(normalizedFormLabel);
  if (canonical) {
    for (const answer of answers) {
      const answerCanonical = findCanonicalLabel(answer.fieldLabel);
      if (answerCanonical === canonical) {
        return answer.answer;
      }
    }
  }

  return null;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/unit/field-matcher.test.ts
```

Expected: All 7 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/field-matcher.ts tests/unit/field-matcher.test.ts
git commit -m "feat: add form field matcher with alias support and tests"
```

---

### Task 7: Dropdown Handler

**Files:**
- Create: `src/lib/automation/dropdown-handler.ts`, `tests/unit/dropdown-handler.test.ts`

- [ ] **Step 1: Write the failing tests**

`tests/unit/dropdown-handler.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { findBestOption } from "@/lib/automation/dropdown-handler";

describe("findBestOption", () => {
  it("finds exact match", () => {
    const options = ["1", "3", "5", "8", "10+"];
    expect(findBestOption("8", options)).toBe("8");
  });

  it("finds case-insensitive match", () => {
    const options = ["Yes", "No"];
    expect(findBestOption("yes", options)).toBe("Yes");
  });

  it("finds contains match", () => {
    const options = [
      "Entry level (0-2 years)",
      "Mid level (3-5 years)",
      "Senior level (6+ years)",
    ];
    expect(findBestOption("Senior", options)).toBe("Senior level (6+ years)");
  });

  it("finds closest numeric match", () => {
    const options = ["1-3", "4-6", "7-9", "10+"];
    expect(findBestOption("8", options)).toBe("7-9");
  });

  it("returns null when no match found", () => {
    const options = ["Java", "Python", "C++"];
    expect(findBestOption("Playwright", options)).toBeNull();
  });

  it("handles Yes/No boolean questions", () => {
    const options = ["Yes", "No"];
    expect(findBestOption("Yes", options)).toBe("Yes");
    expect(findBestOption("No", options)).toBe("No");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/unit/dropdown-handler.test.ts
```

Expected: FAIL - module not found.

- [ ] **Step 3: Implement dropdown handler**

`src/lib/automation/dropdown-handler.ts`:
```ts
export function findBestOption(answer: string, options: string[]): string | null {
  const normalizedAnswer = answer.toLowerCase().trim();

  // 1. Exact match (case-insensitive)
  for (const option of options) {
    if (option.toLowerCase().trim() === normalizedAnswer) {
      return option;
    }
  }

  // 2. Contains match
  for (const option of options) {
    if (option.toLowerCase().includes(normalizedAnswer)) {
      return option;
    }
  }
  for (const option of options) {
    if (normalizedAnswer.includes(option.toLowerCase().trim())) {
      return option;
    }
  }

  // 3. Numeric range match
  const answerNum = parseFloat(normalizedAnswer);
  if (!isNaN(answerNum)) {
    for (const option of options) {
      const rangeMatch = option.match(/(\d+)\s*[-\u2013]\s*(\d+)/);
      if (rangeMatch) {
        const low = parseFloat(rangeMatch[1]);
        const high = parseFloat(rangeMatch[2]);
        if (answerNum >= low && answerNum <= high) {
          return option;
        }
      }
      const plusMatch = option.match(/(\d+)\+/);
      if (plusMatch && answerNum >= parseFloat(plusMatch[1])) {
        return option;
      }
    }
  }

  return null;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/unit/dropdown-handler.test.ts
```

Expected: All 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/automation/dropdown-handler.ts tests/unit/dropdown-handler.test.ts
git commit -m "feat: add dropdown option matcher with numeric range support and tests"
```

---

### Task 8: Data Parser

**Files:**
- Create: `src/lib/data-parser.ts`, `tests/unit/data-parser.test.ts`

- [ ] **Step 1: Write the failing tests**

`tests/unit/data-parser.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { parseJobIdFromUrl, parseJobData } from "@/lib/data-parser";

describe("parseJobIdFromUrl", () => {
  it("extracts job ID from standard URL", () => {
    expect(parseJobIdFromUrl("https://www.linkedin.com/jobs/view/3912345678/")).toBe("3912345678");
  });

  it("extracts job ID from URL with query params", () => {
    expect(
      parseJobIdFromUrl("https://www.linkedin.com/jobs/view/3912345678/?trackingId=abc")
    ).toBe("3912345678");
  });

  it("returns null for invalid URL", () => {
    expect(parseJobIdFromUrl("https://www.linkedin.com/feed/")).toBeNull();
  });
});

describe("parseJobData", () => {
  it("parses a complete job data object", () => {
    const raw = {
      title: "  Senior QA Engineer  ",
      company: "Acme Corp  ",
      location: "  Remote  ",
      url: "https://www.linkedin.com/jobs/view/123/",
    };
    const result = parseJobData(raw);
    expect(result).toEqual({
      linkedinJobId: "123",
      title: "Senior QA Engineer",
      company: "Acme Corp",
      location: "Remote",
      url: "https://www.linkedin.com/jobs/view/123/",
    });
  });

  it("returns null when URL cannot be parsed", () => {
    const raw = { title: "Test", company: "Co", location: "NYC", url: "invalid" };
    expect(parseJobData(raw)).toBeNull();
  });

  it("returns null when required fields are missing", () => {
    expect(parseJobData({ title: "", company: "Co", location: "NYC", url: "https://www.linkedin.com/jobs/view/1/" })).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/unit/data-parser.test.ts
```

Expected: FAIL - module not found.

- [ ] **Step 3: Implement data parser**

`src/lib/data-parser.ts`:
```ts
export interface ParsedJob {
  linkedinJobId: string;
  title: string;
  company: string;
  location: string;
  url: string;
}

export function parseJobIdFromUrl(url: string): string | null {
  const match = url.match(/\/jobs\/view\/(\d+)/);
  return match ? match[1] : null;
}

export function parseJobData(raw: {
  title: string;
  company: string;
  location: string;
  url: string;
}): ParsedJob | null {
  const title = raw.title?.trim();
  const company = raw.company?.trim();
  const location = raw.location?.trim();
  const url = raw.url?.trim();

  if (!title || !company || !location || !url) return null;

  const linkedinJobId = parseJobIdFromUrl(url);
  if (!linkedinJobId) return null;

  return { linkedinJobId, title, company, location, url };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/unit/data-parser.test.ts
```

Expected: All 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/data-parser.ts tests/unit/data-parser.test.ts
git commit -m "feat: add job data parser with URL extraction and tests"
```

---

### Task 9: Dedup Logic

**Files:**
- Create: `src/lib/dedup.ts`, `tests/unit/dedup.test.ts`

- [ ] **Step 1: Write the failing tests**

`tests/unit/dedup.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { isJobProcessed } from "@/lib/dedup";

describe("isJobProcessed", () => {
  const processedIds = new Set(["111", "222", "333"]);

  it("returns true for a processed job", () => {
    expect(isJobProcessed("222", processedIds)).toBe(true);
  });

  it("returns false for a new job", () => {
    expect(isJobProcessed("444", processedIds)).toBe(false);
  });

  it("returns false for empty set", () => {
    expect(isJobProcessed("111", new Set())).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/unit/dedup.test.ts
```

Expected: FAIL - module not found.

- [ ] **Step 3: Implement dedup**

`src/lib/dedup.ts`:
```ts
import { prisma } from "@/lib/db";

export function isJobProcessed(linkedinJobId: string, processedIds: Set<string>): boolean {
  return processedIds.has(linkedinJobId);
}

export async function loadProcessedJobIds(): Promise<Set<string>> {
  const jobs = await prisma.job.findMany({
    select: { linkedinJobId: true },
  });
  return new Set(jobs.map((j) => j.linkedinJobId));
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/unit/dedup.test.ts
```

Expected: All 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/dedup.ts tests/unit/dedup.test.ts
git commit -m "feat: add job dedup logic with tests"
```

---

### Task 10: API Routes - Config

**Files:**
- Create: `src/app/api/config/route.ts`, `src/app/api/config/profile-answers/route.ts`, `tests/integration/api/config.test.ts`

- [ ] **Step 1: Write the failing tests**

`tests/integration/api/config.test.ts`:
```ts
import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/db";

describe("Config API", () => {
  beforeEach(async () => {
    await prisma.searchConfig.deleteMany();
    await prisma.profileAnswer.deleteMany();
  });

  describe("SearchConfig CRUD", () => {
    it("creates a search config", async () => {
      const { POST } = await import("@/app/api/config/route");
      const req = new Request("http://localhost/api/config", {
        method: "POST",
        body: JSON.stringify({
          keywords: "QA Engineer",
          location: "Remote",
          remotePreference: "remote",
          experienceLevel: "senior",
          datePosted: "past_24_hours",
        }),
        headers: { "Content-Type": "application/json" },
      });
      const res = await POST(req);
      const data = await res.json();
      expect(res.status).toBe(201);
      expect(data.keywords).toBe("QA Engineer");
      expect(data.isActive).toBe(true);
    });

    it("lists all search configs", async () => {
      await prisma.searchConfig.create({
        data: { keywords: "SDET", location: "NYC", remotePreference: "any", experienceLevel: "senior", datePosted: "past_week" },
      });
      const { GET } = await import("@/app/api/config/route");
      const req = new Request("http://localhost/api/config");
      const res = await GET(req);
      const data = await res.json();
      expect(data.configs).toHaveLength(1);
      expect(data.configs[0].keywords).toBe("SDET");
    });

    it("deletes a search config", async () => {
      const config = await prisma.searchConfig.create({
        data: { keywords: "Test", location: "", remotePreference: "any", experienceLevel: "mid", datePosted: "any" },
      });
      const { DELETE: del } = await import("@/app/api/config/route");
      const req = new Request(`http://localhost/api/config?id=${config.id}`, { method: "DELETE" });
      const res = await del(req);
      expect(res.status).toBe(200);
    });
  });

  describe("ProfileAnswer CRUD", () => {
    it("creates a profile answer", async () => {
      const { POST } = await import("@/app/api/config/profile-answers/route");
      const req = new Request("http://localhost/api/config/profile-answers", {
        method: "POST",
        body: JSON.stringify({ fieldLabel: "Phone number", fieldType: "text", answer: "555-123-4567" }),
        headers: { "Content-Type": "application/json" },
      });
      const res = await POST(req);
      const data = await res.json();
      expect(res.status).toBe(201);
      expect(data.fieldLabel).toBe("Phone number");
    });

    it("lists all profile answers", async () => {
      await prisma.profileAnswer.create({ data: { fieldLabel: "Phone", fieldType: "text", answer: "555" } });
      const { GET } = await import("@/app/api/config/profile-answers/route");
      const req = new Request("http://localhost/api/config/profile-answers");
      const res = await GET(req);
      const data = await res.json();
      expect(data.answers).toHaveLength(1);
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/integration/api/config.test.ts
```

Expected: FAIL - modules not found.

- [ ] **Step 3: Implement config API route**

`src/app/api/config/route.ts`:
```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  const configs = await prisma.searchConfig.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ configs });
}

export async function POST(req: Request) {
  const body = await req.json();
  const config = await prisma.searchConfig.create({
    data: {
      keywords: body.keywords,
      location: body.location ?? "",
      remotePreference: body.remotePreference ?? "any",
      experienceLevel: body.experienceLevel ?? "senior",
      datePosted: body.datePosted ?? "past_24_hours",
      isActive: body.isActive ?? true,
    },
  });
  return NextResponse.json(config, { status: 201 });
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  await prisma.searchConfig.delete({ where: { id: parseInt(id) } });
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 4: Implement profile answers API route**

`src/app/api/config/profile-answers/route.ts`:
```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  const answers = await prisma.profileAnswer.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ answers });
}

export async function POST(req: Request) {
  const body = await req.json();
  const answer = await prisma.profileAnswer.create({
    data: { fieldLabel: body.fieldLabel, fieldType: body.fieldType, answer: body.answer },
  });
  return NextResponse.json(answer, { status: 201 });
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  await prisma.profileAnswer.delete({ where: { id: parseInt(id) } });
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npx vitest run tests/integration/api/config.test.ts
```

Expected: All 5 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/config/ tests/integration/api/config.test.ts
git commit -m "feat: add config and profile answers API routes with tests"
```

---

### Task 11: API Routes - Jobs

**Files:**
- Create: `src/app/api/jobs/route.ts`, `tests/integration/api/jobs.test.ts`

- [ ] **Step 1: Write the failing tests**

`tests/integration/api/jobs.test.ts`:
```ts
import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/db";

describe("Jobs API", () => {
  beforeEach(async () => {
    await prisma.job.deleteMany();
  });

  it("returns empty list when no jobs exist", async () => {
    const { GET } = await import("@/app/api/jobs/route");
    const req = new Request("http://localhost/api/jobs");
    const res = await GET(req);
    const data = await res.json();
    expect(data.jobs).toEqual([]);
    expect(data.total).toBe(0);
  });

  it("filters jobs by status", async () => {
    await prisma.job.create({
      data: { linkedinJobId: "j1", title: "QA", company: "A", location: "R", url: "u1", status: "applied", searchQuery: "QA" },
    });
    await prisma.job.create({
      data: { linkedinJobId: "j2", title: "SDET", company: "B", location: "R", url: "u2", status: "needs_review", searchQuery: "SDET" },
    });
    const { GET } = await import("@/app/api/jobs/route");
    const req = new Request("http://localhost/api/jobs?status=needs_review");
    const res = await GET(req);
    const data = await res.json();
    expect(data.jobs).toHaveLength(1);
    expect(data.jobs[0].status).toBe("needs_review");
  });

  it("returns stats summary", async () => {
    await prisma.job.create({
      data: { linkedinJobId: "s1", title: "QA", company: "A", location: "R", url: "u1", status: "applied", searchQuery: "Q" },
    });
    await prisma.job.create({
      data: { linkedinJobId: "s2", title: "QA", company: "B", location: "R", url: "u2", status: "skipped", searchQuery: "Q" },
    });
    const { GET } = await import("@/app/api/jobs/route");
    const req = new Request("http://localhost/api/jobs?stats=true");
    const res = await GET(req);
    const data = await res.json();
    expect(data.stats.total).toBe(2);
    expect(data.stats.applied).toBe(1);
    expect(data.stats.skipped).toBe(1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/integration/api/jobs.test.ts
```

Expected: FAIL - module not found.

- [ ] **Step 3: Implement jobs API route**

`src/app/api/jobs/route.ts`:
```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const limit = parseInt(searchParams.get("limit") ?? "50");
  const offset = parseInt(searchParams.get("offset") ?? "0");
  const statsOnly = searchParams.get("stats") === "true";

  if (statsOnly) {
    const [total, applied, skipped, needsReview, errors] = await Promise.all([
      prisma.job.count(),
      prisma.job.count({ where: { status: "applied" } }),
      prisma.job.count({ where: { status: "skipped" } }),
      prisma.job.count({ where: { status: "needs_review" } }),
      prisma.job.count({ where: { status: "error" } }),
    ]);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const appliedToday = await prisma.job.count({
      where: { status: "applied", appliedAt: { gte: todayStart } },
    });

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    const appliedThisWeek = await prisma.job.count({
      where: { status: "applied", appliedAt: { gte: weekStart } },
    });

    const topCompanies = await prisma.job.groupBy({
      by: ["company"],
      where: { status: "applied" },
      _count: { company: true },
      orderBy: { _count: { company: "desc" } },
      take: 10,
    });

    return NextResponse.json({
      stats: {
        total, applied, skipped, needsReview, errors, appliedToday, appliedThisWeek,
        topCompanies: topCompanies.map((c) => ({ company: c.company, count: c._count.company })),
      },
    });
  }

  const where = status ? { status } : {};
  const [jobs, total] = await Promise.all([
    prisma.job.findMany({ where, orderBy: { appliedAt: "desc" }, take: limit, skip: offset }),
    prisma.job.count({ where }),
  ]);

  return NextResponse.json({ jobs, total });
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/integration/api/jobs.test.ts
```

Expected: All 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/jobs/route.ts tests/integration/api/jobs.test.ts
git commit -m "feat: add jobs API route with filtering, pagination, and stats"
```

---

### Task 12: API Routes - Session (Credentials)

**Files:**
- Create: `src/app/api/session/route.ts`

- [ ] **Step 1: Implement session API route**

`src/app/api/session/route.ts`:
```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { encrypt, decrypt } from "@/lib/encryption/crypto";

function getEncryptionKey(): string {
  const key = process.env.ENCRYPTION_KEY;
  if (!key || key.length < 32) {
    throw new Error("ENCRYPTION_KEY env var must be set (64 hex chars = 32 bytes)");
  }
  return key.padEnd(64, "0").slice(0, 64);
}

export async function GET(req: Request) {
  const credential = await prisma.credential.findFirst();
  if (!credential) return NextResponse.json({ hasCredentials: false });

  try {
    const key = getEncryptionKey();
    const email = decrypt(credential.email, key);
    return NextResponse.json({ hasCredentials: true, email, password: "********" });
  } catch {
    return NextResponse.json({ hasCredentials: true, email: "***", password: "********" });
  }
}

export async function POST(req: Request) {
  const body = await req.json();
  const key = getEncryptionKey();

  await prisma.credential.deleteMany();

  const encryptedEmail = encrypt(body.email, key);
  const encryptedPassword = encrypt(body.password, key);
  const encryptionCheck = encrypt("valid", key);

  await prisma.credential.create({
    data: { email: encryptedEmail, password: encryptedPassword, encryptionCheck },
  });

  return NextResponse.json({ success: true }, { status: 201 });
}

export async function DELETE(req: Request) {
  await prisma.credential.deleteMany();
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/session/route.ts
git commit -m "feat: add session API for encrypted credential storage"
```

---

### Task 13: API Routes - Automation Control + Logs

**Files:**
- Create: `src/lib/automation/state.ts`, `src/app/api/automation/route.ts`, `src/app/api/logs/route.ts`

- [ ] **Step 1: Implement automation state module**

`src/lib/automation/state.ts`:
```ts
export type AutomationStatus =
  | "idle"
  | "running"
  | "paused"
  | "stopping"
  | "error"
  | "captcha_required";

export interface AutomationState {
  status: AutomationStatus;
  currentJob: string | null;
  appliedThisRun: number;
  skippedThisRun: number;
  errorsThisRun: number;
  startedAt: string | null;
}

let state: AutomationState = {
  status: "idle",
  currentJob: null,
  appliedThisRun: 0,
  skippedThisRun: 0,
  errorsThisRun: 0,
  startedAt: null,
};

export function getState(): AutomationState {
  return { ...state };
}

export function updateState(partial: Partial<AutomationState>): void {
  state = { ...state, ...partial };
}

export function resetState(): void {
  state = {
    status: "idle",
    currentJob: null,
    appliedThisRun: 0,
    skippedThisRun: 0,
    errorsThisRun: 0,
    startedAt: null,
  };
}
```

- [ ] **Step 2: Implement automation API route**

`src/app/api/automation/route.ts`:
```ts
import { NextResponse } from "next/server";
import { getState, updateState, resetState } from "@/lib/automation/state";

export async function GET(req: Request) {
  return NextResponse.json(getState());
}

export async function POST(req: Request) {
  const body = await req.json();
  const { action } = body;

  if (action === "start") {
    const currentState = getState();
    if (currentState.status === "running") {
      return NextResponse.json({ error: "Already running" }, { status: 409 });
    }
    resetState();
    updateState({ status: "running", startedAt: new Date().toISOString() });
    // Engine will be wired in Task 18
    return NextResponse.json({ success: true, status: "running" });
  }

  if (action === "stop") {
    updateState({ status: "stopping" });
    return NextResponse.json({ success: true, status: "stopping" });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
```

- [ ] **Step 3: Implement logs API route**

`src/app/api/logs/route.ts`:
```ts
import { NextResponse } from "next/server";
import { readLogs } from "@/lib/logging/log-reader";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action") ?? undefined;
  const date = searchParams.get("date") ?? undefined;
  const exportFormat = searchParams.get("export");

  const logs = readLogs(undefined, { action, date });

  if (exportFormat === "json") {
    const content = logs.map((l) => JSON.stringify(l)).join("\n");
    return new Response(content, {
      headers: {
        "Content-Type": "application/jsonl",
        "Content-Disposition": `attachment; filename="automation-logs-${date ?? "all"}.jsonl"`,
      },
    });
  }

  return NextResponse.json({ logs, total: logs.length });
}
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/automation/state.ts src/app/api/automation/route.ts src/app/api/logs/route.ts
git commit -m "feat: add automation control and logs API routes"
```

---

### Task 14: Automation - Screenshot Utility

**Files:**
- Create: `src/lib/automation/screenshot.ts`

- [ ] **Step 1: Implement screenshot utility**

`src/lib/automation/screenshot.ts`:
```ts
import { Page } from "playwright";
import path from "path";
import fs from "fs";

const SCREENSHOT_DIR = path.join(process.cwd(), "screenshots");

export async function captureScreenshot(page: Page, label: string): Promise<string> {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const safeName = label.replace(/[^a-zA-Z0-9-]/g, "-").slice(0, 60);
  const filename = `${timestamp}-${safeName}.png`;
  const filepath = path.join(SCREENSHOT_DIR, filename);

  await page.screenshot({ path: filepath, fullPage: false });
  return `screenshots/${filename}`;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/automation/screenshot.ts
git commit -m "feat: add screenshot capture utility for automation errors"
```

---

### Task 15: Automation - Login Module

**Files:**
- Create: `src/lib/automation/login.ts`

- [ ] **Step 1: Implement login module**

`src/lib/automation/login.ts`:
```ts
import { Browser, BrowserContext, Page, chromium } from "playwright";
import fs from "fs";
import path from "path";
import { prisma } from "@/lib/db";
import { decrypt } from "@/lib/encryption/crypto";
import { AutomationLogger } from "@/lib/logging/logger";
import { updateState } from "./state";

const COOKIE_DIR = path.join(process.cwd(), "cookies");
const COOKIE_FILE = path.join(COOKIE_DIR, "linkedin-session.json");

export interface LoginResult {
  browser: Browser;
  context: BrowserContext;
  page: Page;
  success: boolean;
  method: "cookie" | "credentials" | "failed";
}

async function getCredentials(): Promise<{ email: string; password: string } | null> {
  const credential = await prisma.credential.findFirst();
  if (!credential) return null;

  const key = (process.env.ENCRYPTION_KEY ?? "").padEnd(64, "0").slice(0, 64);
  try {
    return {
      email: decrypt(credential.email, key),
      password: decrypt(credential.password, key),
    };
  } catch {
    return null;
  }
}

function savedCookiesExist(): boolean {
  return fs.existsSync(COOKIE_FILE);
}

function loadCookies(): Array<{ name: string; value: string; domain: string; path: string }> {
  const raw = fs.readFileSync(COOKIE_FILE, "utf8");
  return JSON.parse(raw);
}

function saveCookies(cookies: Array<{ name: string; value: string; domain: string; path: string }>): void {
  fs.mkdirSync(COOKIE_DIR, { recursive: true });
  fs.writeFileSync(COOKIE_FILE, JSON.stringify(cookies, null, 2));
}

async function isLoggedIn(page: Page): Promise<boolean> {
  try {
    await page.goto("https://www.linkedin.com/feed/", { waitUntil: "domcontentloaded", timeout: 15000 });
    const url = page.url();
    return url.includes("/feed") || url.includes("/jobs");
  } catch {
    return false;
  }
}

async function loginWithCredentials(
  page: Page,
  email: string,
  password: string,
  logger: AutomationLogger
): Promise<boolean> {
  try {
    await page.goto("https://www.linkedin.com/login", { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.fill("#username", email);
    await page.fill("#password", password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);

    const url = page.url();

    if (url.includes("checkpoint") || url.includes("challenge")) {
      logger.log({ action: "captcha_detected", details: { url } });
      updateState({ status: "captcha_required", currentJob: "2FA/CAPTCHA required - handle manually" });

      // Wait up to 2 minutes for user to handle challenge
      for (let i = 0; i < 24; i++) {
        await page.waitForTimeout(5000);
        const currentUrl = page.url();
        if (currentUrl.includes("/feed") || currentUrl.includes("/jobs")) {
          return true;
        }
      }
      return false;
    }

    return url.includes("/feed") || url.includes("/jobs");
  } catch {
    return false;
  }
}

export async function login(logger: AutomationLogger): Promise<LoginResult> {
  const browser = await chromium.launch({ headless: false });
  let context: BrowserContext;
  let page: Page;

  // 1. Try cookie-based login
  if (savedCookiesExist()) {
    try {
      const cookies = loadCookies();
      context = await browser.newContext();
      await context.addCookies(cookies);
      page = await context.newPage();

      if (await isLoggedIn(page)) {
        logger.log({ action: "login_cookie_reuse" });
        return { browser, context, page, success: true, method: "cookie" };
      }
      await context.close();
    } catch {
      // Cookie file corrupted - continue to credentials
    }
  }

  // 2. Fall back to credentials
  const creds = await getCredentials();
  if (!creds) {
    context = await browser.newContext();
    page = await context.newPage();
    logger.log({ action: "login_fail", reason: "No credentials configured" });
    return { browser, context, page, success: false, method: "failed" };
  }

  context = await browser.newContext();
  page = await context.newPage();

  const success = await loginWithCredentials(page, creds.email, creds.password, logger);

  if (success) {
    const cookies = await context.cookies();
    saveCookies(cookies);
    logger.log({ action: "login_success" });
    return { browser, context, page, success: true, method: "credentials" };
  }

  logger.log({ action: "login_fail", reason: "Credential login failed" });
  return { browser, context, page, success: false, method: "failed" };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/automation/login.ts
git commit -m "feat: add login module with cookie-first auth and credential fallback"
```

---

### Task 16: Automation - Search Module

**Files:**
- Create: `src/lib/automation/search.ts`

- [ ] **Step 1: Implement search module**

`src/lib/automation/search.ts`:
```ts
import { Page } from "playwright";
import { buildSearchUrl, SearchParams } from "@/lib/filter-builder";
import { parseJobData, ParsedJob } from "@/lib/data-parser";
import { AutomationLogger } from "@/lib/logging/logger";

function randomDelay(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export async function searchJobs(
  page: Page,
  params: SearchParams,
  logger: AutomationLogger
): Promise<ParsedJob[]> {
  const allJobs: ParsedJob[] = [];
  let currentPage = 0;
  const maxPages = 10;

  logger.log({
    action: "search_start",
    details: { query: params.keywords, location: params.location },
  });

  while (currentPage < maxPages) {
    const url = buildSearchUrl(params, currentPage);
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
    await page.waitForTimeout(randomDelay(2000, 4000));

    try {
      await page.waitForSelector(".jobs-search-results-list", { timeout: 10000 });
    } catch {
      break;
    }

    const jobCards = await page.$$(".jobs-search-results__list-item, .job-card-container");
    if (jobCards.length === 0) break;

    for (const card of jobCards) {
      try {
        const title = await card.$eval(
          ".job-card-list__title, .artdeco-entity-lockup__title",
          (el) => el.textContent ?? ""
        ).catch(() => "");

        const company = await card.$eval(
          ".job-card-container__primary-description, .artdeco-entity-lockup__subtitle",
          (el) => el.textContent ?? ""
        ).catch(() => "");

        const location = await card.$eval(
          ".job-card-container__metadata-item, .artdeco-entity-lockup__caption",
          (el) => el.textContent ?? ""
        ).catch(() => "");

        const linkEl = await card.$("a.job-card-list__title, a.job-card-container__link");
        const href = linkEl ? await linkEl.getAttribute("href") : null;
        const jobUrl = href ? `https://www.linkedin.com${href.split("?")[0]}` : "";

        const parsed = parseJobData({ title, company, location, url: jobUrl });
        if (parsed) allJobs.push(parsed);
      } catch {
        // Skip unparseable cards
      }
    }

    const nextButton = await page.$('button[aria-label="Next"]');
    const isDisabled = nextButton ? await nextButton.getAttribute("disabled") : "true";
    if (!nextButton || isDisabled !== null) break;

    currentPage++;
    await page.waitForTimeout(randomDelay(1000, 3000));
  }

  logger.log({
    action: "search_results",
    details: { query: params.keywords, totalFound: allJobs.length, pagesScanned: currentPage + 1 },
  });

  return allJobs;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/automation/search.ts
git commit -m "feat: add job search module with pagination and data extraction"
```

---

### Task 17: Automation - Form Filler + Apply

**Files:**
- Create: `src/lib/automation/form-filler.ts`, `src/lib/automation/apply.ts`

- [ ] **Step 1: Implement form filler**

`src/lib/automation/form-filler.ts`:
```ts
import { Page, ElementHandle } from "playwright";
import { matchField, ProfileAnswerRecord } from "@/lib/field-matcher";
import { findBestOption } from "@/lib/automation/dropdown-handler";

export interface FillResult {
  success: boolean;
  unfilledFields: Array<{ label: string; type: string }>;
}

async function fillTextField(page: Page, input: ElementHandle, answer: string): Promise<void> {
  await input.click();
  await input.fill("");
  for (const char of answer) {
    await input.type(char, { delay: Math.random() * 50 + 20 });
  }
}

async function fillSelectField(page: Page, select: ElementHandle, answer: string): Promise<boolean> {
  const options = await select.$$eval("option", (opts: HTMLOptionElement[]) =>
    opts.map((o) => o.textContent?.trim() ?? "").filter(Boolean)
  );
  const best = findBestOption(answer, options);
  if (!best) return false;
  await select.selectOption({ label: best });
  return true;
}

async function fillLinkedInDropdown(page: Page, container: ElementHandle, answer: string): Promise<boolean> {
  const input = await container.$("input");
  if (!input) return false;

  await input.click();
  await input.fill(answer);
  await page.waitForTimeout(1000);

  const options = await page.$$(".basic-typeahead__selectable, [role='option']");
  if (options.length === 0) return false;

  const optionTexts: string[] = [];
  for (const opt of options) {
    const text = await opt.textContent();
    optionTexts.push(text?.trim() ?? "");
  }

  const best = findBestOption(answer, optionTexts);
  const idx = best ? optionTexts.indexOf(best) : 0;
  await options[idx >= 0 ? idx : 0].click();
  return true;
}

async function fillRadioField(page: Page, fieldset: ElementHandle, answer: string): Promise<boolean> {
  const labels = await fieldset.$$("label");
  for (const label of labels) {
    const text = (await label.textContent())?.trim().toLowerCase() ?? "";
    if (text === answer.toLowerCase() || text.includes(answer.toLowerCase())) {
      await label.click();
      return true;
    }
  }
  return false;
}

export async function fillFormStep(
  page: Page,
  answers: ProfileAnswerRecord[]
): Promise<FillResult> {
  const unfilledFields: Array<{ label: string; type: string }> = [];
  const formGroups = await page.$$(".jobs-easy-apply-form-section__grouping, .fb-dash-form-element");

  for (const group of formGroups) {
    const labelEl = await group.$("label, .fb-dash-form-element__label, legend");
    const labelText = labelEl ? ((await labelEl.textContent()) ?? "").trim() : "";
    if (!labelText) continue;

    const textInput = await group.$('input[type="text"], input[type="tel"], input[type="email"], input[type="url"]');
    const textarea = await group.$("textarea");
    const select = await group.$("select");
    const typeahead = await group.$(".basic-typeahead, [data-test-text-entity-list-filter-typeahead]");
    const radioGroup = await group.$('fieldset, [role="radiogroup"]');
    const fileInput = await group.$('input[type="file"]');
    const checkbox = await group.$('input[type="checkbox"]');

    if (textInput) {
      const currentValue = await textInput.inputValue();
      if (currentValue) continue;
      const answer = matchField(labelText, "text", answers);
      if (answer) {
        await fillTextField(page, textInput, answer);
      } else {
        const ariaRequired = await textInput.getAttribute("aria-required");
        const required = await textInput.getAttribute("required");
        if (required !== null || ariaRequired === "true") {
          unfilledFields.push({ label: labelText, type: "text" });
        }
      }
    } else if (textarea) {
      const currentValue = await textarea.inputValue();
      if (currentValue) continue;
      const answer = matchField(labelText, "textarea", answers);
      if (answer) {
        await fillTextField(page, textarea, answer);
      } else {
        const ariaRequired = await textarea.getAttribute("aria-required");
        const required = await textarea.getAttribute("required");
        if (required !== null || ariaRequired === "true") {
          unfilledFields.push({ label: labelText, type: "textarea" });
        }
      }
    } else if (select) {
      const answer = matchField(labelText, "select", answers);
      if (answer) {
        const filled = await fillSelectField(page, select, answer);
        if (!filled) unfilledFields.push({ label: labelText, type: "select" });
      } else {
        const ariaRequired = await select.getAttribute("aria-required");
        const required = await select.getAttribute("required");
        if (required !== null || ariaRequired === "true") {
          unfilledFields.push({ label: labelText, type: "select" });
        }
      }
    } else if (typeahead) {
      const answer = matchField(labelText, "select", answers);
      if (answer) {
        await fillLinkedInDropdown(page, typeahead, answer);
      } else {
        unfilledFields.push({ label: labelText, type: "typeahead" });
      }
    } else if (radioGroup) {
      const answer = matchField(labelText, "radio", answers);
      if (answer) {
        const filled = await fillRadioField(page, radioGroup, answer);
        if (!filled) unfilledFields.push({ label: labelText, type: "radio" });
      } else {
        unfilledFields.push({ label: labelText, type: "radio" });
      }
    } else if (fileInput) {
      const uploadedIndicator = await group.$(".jobs-document-upload__upload-label--complete");
      if (!uploadedIndicator) {
        const answer = matchField(labelText, "file", answers);
        if (answer) {
          await fileInput.setInputFiles(answer);
        } else {
          unfilledFields.push({ label: labelText, type: "file" });
        }
      }
    } else if (checkbox) {
      const answer = matchField(labelText, "checkbox", answers);
      if (answer && answer.toLowerCase() === "yes") {
        const isChecked = await checkbox.isChecked();
        if (!isChecked) await checkbox.check();
      }
    }
  }

  return { success: unfilledFields.length === 0, unfilledFields };
}
```

- [ ] **Step 2: Implement apply module**

`src/lib/automation/apply.ts`:
```ts
import { Page } from "playwright";
import { ParsedJob } from "@/lib/data-parser";
import { ProfileAnswerRecord } from "@/lib/field-matcher";
import { fillFormStep } from "./form-filler";
import { captureScreenshot } from "./screenshot";
import { AutomationLogger } from "@/lib/logging/logger";
import { prisma } from "@/lib/db";
import { updateState } from "./state";

function randomDelay(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export interface ApplyResult {
  status: "applied" | "skipped" | "needs_review" | "error";
  reason?: string;
  screenshot?: string;
}

export async function applyToJob(
  page: Page,
  job: ParsedJob,
  answers: ProfileAnswerRecord[],
  logger: AutomationLogger
): Promise<ApplyResult> {
  const startTime = Date.now();
  updateState({ currentJob: `Applying to ${job.title} at ${job.company}` });

  try {
    await page.goto(job.url, { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForTimeout(randomDelay(1000, 2000));

    const easyApplyBtn = await page.$('button.jobs-apply-button, button[aria-label*="Easy Apply"]');
    if (!easyApplyBtn) {
      return { status: "skipped", reason: "No Easy Apply button found" };
    }
    await easyApplyBtn.click();
    await page.waitForTimeout(randomDelay(1000, 2000));

    const maxSteps = 10;
    for (let step = 0; step < maxSteps; step++) {
      await page.waitForTimeout(randomDelay(500, 1000));

      const submitBtn = await page.$('button[aria-label="Submit application"]');
      if (submitBtn) {
        const fillResult = await fillFormStep(page, answers);
        if (!fillResult.success) {
          const screenshot = await captureScreenshot(page, `${job.company}-${job.title}-unfilled`);
          logger.log({
            action: "apply_skip",
            job: { linkedinJobId: job.linkedinJobId, title: job.title, company: job.company, url: job.url },
            reason: "unknown_required_field",
            details: { unfilledFields: fillResult.unfilledFields, formStep: step + 1 },
            screenshot,
            durationMs: Date.now() - startTime,
          });

          const closeBtn = await page.$('button[aria-label="Dismiss"]');
          if (closeBtn) await closeBtn.click();
          const discardBtn = await page.$('button[data-test-dialog-primary-btn]');
          if (discardBtn) await discardBtn.click();

          return {
            status: "needs_review",
            reason: `Unknown fields: ${fillResult.unfilledFields.map((f) => f.label).join(", ")}`,
            screenshot,
          };
        }

        await submitBtn.click();
        await page.waitForTimeout(randomDelay(1000, 2000));

        logger.log({
          action: "apply_success",
          job: { linkedinJobId: job.linkedinJobId, title: job.title, company: job.company, url: job.url },
          details: { formSteps: step + 1 },
          durationMs: Date.now() - startTime,
        });

        const doneBtn = await page.$('button[aria-label="Done"], button[aria-label="Dismiss"]');
        if (doneBtn) await doneBtn.click();

        return { status: "applied" };
      }

      const fillResult = await fillFormStep(page, answers);
      if (!fillResult.success) {
        const screenshot = await captureScreenshot(page, `${job.company}-${job.title}-unfilled`);
        logger.log({
          action: "apply_skip",
          job: { linkedinJobId: job.linkedinJobId, title: job.title, company: job.company, url: job.url },
          reason: "unknown_required_field",
          details: { unfilledFields: fillResult.unfilledFields, formStep: step + 1 },
          screenshot,
          durationMs: Date.now() - startTime,
        });

        const closeBtn = await page.$('button[aria-label="Dismiss"]');
        if (closeBtn) await closeBtn.click();
        const discardBtn = await page.$('button[data-test-dialog-primary-btn]');
        if (discardBtn) await discardBtn.click();

        return {
          status: "needs_review",
          reason: `Unknown fields: ${fillResult.unfilledFields.map((f) => f.label).join(", ")}`,
          screenshot,
        };
      }

      const nextBtn = await page.$(
        'button[aria-label="Continue to next step"], button[aria-label="Review your application"]'
      );
      if (nextBtn) {
        await nextBtn.click();
        await page.waitForTimeout(randomDelay(500, 1500));
      } else {
        break;
      }
    }

    const screenshot = await captureScreenshot(page, `${job.company}-${job.title}-stuck`);
    logger.log({
      action: "apply_error",
      job: { linkedinJobId: job.linkedinJobId, title: job.title, company: job.company, url: job.url },
      reason: "max_steps_exceeded",
      screenshot,
      durationMs: Date.now() - startTime,
    });

    return { status: "error", reason: "Max form steps exceeded", screenshot };
  } catch (err) {
    const screenshot = await captureScreenshot(page, `${job.company}-${job.title}-error`).catch(() => undefined);
    logger.log({
      action: "apply_error",
      job: { linkedinJobId: job.linkedinJobId, title: job.title, company: job.company, url: job.url },
      reason: String(err),
      screenshot,
      durationMs: Date.now() - startTime,
    });
    return { status: "error", reason: String(err), screenshot };
  }
}

export async function saveJobResult(job: ParsedJob, result: ApplyResult, searchQuery: string): Promise<void> {
  await prisma.job.upsert({
    where: { linkedinJobId: job.linkedinJobId },
    create: {
      linkedinJobId: job.linkedinJobId,
      title: job.title,
      company: job.company,
      location: job.location,
      url: job.url,
      status: result.status,
      skipReason: result.reason,
      searchQuery,
    },
    update: { status: result.status, skipReason: result.reason },
  });
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/automation/form-filler.ts src/lib/automation/apply.ts
git commit -m "feat: add form filler and Easy Apply flow with dropdown/skip handling"
```

---

### Task 18: Automation - Engine Orchestrator

**Files:**
- Create: `src/lib/automation/engine.ts`
- Modify: `src/app/api/automation/route.ts`

- [ ] **Step 1: Implement the engine orchestrator**

`src/lib/automation/engine.ts`:
```ts
import { Browser } from "playwright";
import { login } from "./login";
import { searchJobs } from "./search";
import { applyToJob, saveJobResult } from "./apply";
import { getState, updateState } from "./state";
import { AutomationLogger } from "@/lib/logging/logger";
import { loadProcessedJobIds, isJobProcessed } from "@/lib/dedup";
import { prisma } from "@/lib/db";
import { SearchParams } from "@/lib/filter-builder";
import { ProfileAnswerRecord } from "@/lib/field-matcher";

let activeBrowser: Browser | null = null;

function randomDelay(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export async function startAutomation(): Promise<void> {
  const logger = new AutomationLogger();
  logger.log({ action: "automation_start" });
  updateState({ status: "running", startedAt: new Date().toISOString() });

  try {
    const loginResult = await login(logger);
    activeBrowser = loginResult.browser;

    if (!loginResult.success) {
      updateState({ status: "error", currentJob: "Login failed" });
      logger.log({ action: "automation_stop", reason: "login_failed" });
      await loginResult.browser.close();
      return;
    }

    const page = loginResult.page;

    const configs = await prisma.searchConfig.findMany({ where: { isActive: true } });
    if (configs.length === 0) {
      updateState({ status: "error", currentJob: "No active search configs" });
      logger.log({ action: "automation_stop", reason: "no_configs" });
      await loginResult.browser.close();
      return;
    }

    const answers: ProfileAnswerRecord[] = (await prisma.profileAnswer.findMany()).map((a) => ({
      fieldLabel: a.fieldLabel,
      fieldType: a.fieldType,
      answer: a.answer,
    }));

    const processedIds = await loadProcessedJobIds();
    let totalApplied = 0;
    const maxPerSession = 50;

    for (const config of configs) {
      if (getState().status === "stopping") break;

      const params: SearchParams = {
        keywords: config.keywords,
        location: config.location || undefined,
        remotePreference: config.remotePreference as SearchParams["remotePreference"],
        experienceLevel: config.experienceLevel as SearchParams["experienceLevel"],
        datePosted: config.datePosted as SearchParams["datePosted"],
      };

      updateState({ currentJob: `Searching for "${config.keywords}"...` });
      const jobs = await searchJobs(page, params, logger);

      for (const job of jobs) {
        if (getState().status === "stopping") break;
        if (totalApplied >= maxPerSession) break;
        if (isJobProcessed(job.linkedinJobId, processedIds)) continue;

        const result = await applyToJob(page, job, answers, logger);
        await saveJobResult(job, result, config.keywords);

        processedIds.add(job.linkedinJobId);
        if (result.status === "applied") {
          totalApplied++;
          updateState({ appliedThisRun: getState().appliedThisRun + 1 });
        } else if (result.status === "skipped" || result.status === "needs_review") {
          updateState({ skippedThisRun: getState().skippedThisRun + 1 });
        } else {
          updateState({ errorsThisRun: getState().errorsThisRun + 1 });
        }

        await page.waitForTimeout(randomDelay(3000, 8000));
      }

      if (totalApplied >= maxPerSession) break;
    }

    logger.log({
      action: "automation_stop",
      details: {
        applied: getState().appliedThisRun,
        skipped: getState().skippedThisRun,
        errors: getState().errorsThisRun,
      },
    });

    await loginResult.browser.close();
    activeBrowser = null;
    updateState({ status: "idle", currentJob: null });
  } catch (err) {
    logger.log({ action: "automation_stop", reason: String(err) });
    updateState({ status: "error", currentJob: `Error: ${String(err)}` });
    if (activeBrowser) {
      await activeBrowser.close().catch(() => {});
      activeBrowser = null;
    }
  }
}

export async function stopAutomation(): Promise<void> {
  updateState({ status: "stopping" });
  if (activeBrowser) {
    setTimeout(async () => {
      if (activeBrowser) {
        await activeBrowser.close().catch(() => {});
        activeBrowser = null;
        updateState({ status: "idle", currentJob: null });
      }
    }, 10000);
  }
}
```

- [ ] **Step 2: Wire up engine in automation API route**

Replace `src/app/api/automation/route.ts`:

```ts
import { NextResponse } from "next/server";
import { getState, updateState, resetState } from "@/lib/automation/state";
import { startAutomation, stopAutomation } from "@/lib/automation/engine";

export async function GET(req: Request) {
  return NextResponse.json(getState());
}

export async function POST(req: Request) {
  const body = await req.json();
  const { action } = body;

  if (action === "start") {
    const currentState = getState();
    if (currentState.status === "running") {
      return NextResponse.json({ error: "Already running" }, { status: 409 });
    }
    resetState();
    startAutomation().catch((err) => {
      updateState({ status: "error", currentJob: String(err) });
    });
    return NextResponse.json({ success: true, status: "running" });
  }

  if (action === "stop") {
    await stopAutomation();
    return NextResponse.json({ success: true, status: "stopping" });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/automation/engine.ts src/app/api/automation/route.ts
git commit -m "feat: add automation engine orchestrator and wire up API route"
```

---

### Task 19: Dashboard - Layout + Navigation

**Files:**
- Create: `src/components/sidebar.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Create sidebar component**

`src/components/sidebar.tsx`:
```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { BarChart3, Briefcase, AlertCircle, Settings, Play, ScrollText } from "lucide-react";

const navItems = [
  { href: "/", label: "Dashboard", icon: BarChart3 },
  { href: "/jobs", label: "Applied Jobs", icon: Briefcase },
  { href: "/review", label: "Needs Review", icon: AlertCircle },
  { href: "/config", label: "Configuration", icon: Settings },
  { href: "/automation", label: "Automation", icon: Play },
  { href: "/logs", label: "Logs", icon: ScrollText },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-card">
      <div className="flex h-14 items-center border-b px-4">
        <h1 className="text-lg font-semibold">LinkedIn Auto Apply</h1>
      </div>
      <nav className="flex-1 space-y-1 p-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
```

- [ ] **Step 2: Update root layout**

Replace `src/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "LinkedIn Auto Apply",
  description: "Automatically apply to Easy Apply jobs on LinkedIn",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <div className="flex h-screen">
          <Sidebar />
          <main className="flex-1 overflow-auto p-6">{children}</main>
        </div>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Verify layout renders**

```bash
npm run dev
```

Open http://localhost:3000 - should see sidebar with navigation links and dark theme.

- [ ] **Step 4: Commit**

```bash
git add src/components/sidebar.tsx src/app/layout.tsx
git commit -m "feat: add dashboard layout with sidebar navigation and dark mode"
```

---

### Task 20-25: Dashboard Pages

Tasks 20-25 implement the 6 dashboard pages. Each follows the same pattern: create components, wire them into the page, verify rendering. The complete code for each page is provided in the spec at the following paths. These are detailed in separate sub-tasks below.

---

### Task 20: Dashboard - Stats Page (Home)

**Files:**
- Create: `src/components/dashboard/stats-cards.tsx`, `src/components/dashboard/applications-chart.tsx`, `src/components/dashboard/status-badge.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Create status badge**

`src/components/dashboard/status-badge.tsx`:
```tsx
import { Badge } from "@/components/ui/badge";

const statusColors: Record<string, string> = {
  applied: "bg-green-500/20 text-green-400 border-green-500/30",
  skipped: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  needs_review: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  error: "bg-red-500/20 text-red-400 border-red-500/30",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={statusColors[status] ?? ""}>
      {status.replace("_", " ")}
    </Badge>
  );
}
```

- [ ] **Step 2: Create stats cards**

`src/components/dashboard/stats-cards.tsx`:
```tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase, CheckCircle, AlertCircle, XCircle } from "lucide-react";

interface StatsData {
  total: number;
  applied: number;
  skipped: number;
  needsReview: number;
  errors: number;
  appliedToday: number;
  appliedThisWeek: number;
}

export function StatsCards({ stats }: { stats: StatsData }) {
  const cards = [
    { title: "Total Applied", value: stats.applied, icon: CheckCircle, color: "text-green-400" },
    { title: "Applied Today", value: stats.appliedToday, icon: Briefcase, color: "text-blue-400" },
    { title: "This Week", value: stats.appliedThisWeek, icon: Briefcase, color: "text-purple-400" },
    { title: "Needs Review", value: stats.needsReview, icon: AlertCircle, color: "text-orange-400" },
    { title: "Skipped", value: stats.skipped, icon: XCircle, color: "text-yellow-400" },
    { title: "Errors", value: stats.errors, icon: XCircle, color: "text-red-400" },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
            <card.icon className={`h-4 w-4 ${card.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Create applications chart**

`src/components/dashboard/applications-chart.tsx`:
```tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface ChartData { date: string; applied: number; }

export function ApplicationsChart({ data }: { data: ChartData[] }) {
  return (
    <Card>
      <CardHeader><CardTitle>Applications Over Time</CardTitle></CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-muted-foreground text-sm py-8 text-center">
            No application data yet. Start the automation to see stats.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <XAxis dataKey="date" stroke="#888" fontSize={12} />
              <YAxis stroke="#888" fontSize={12} />
              <Tooltip contentStyle={{ backgroundColor: "#1c1c1c", border: "1px solid #333" }} />
              <Bar dataKey="applied" fill="#22c55e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 4: Implement home page**

Replace `src/app/page.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { ApplicationsChart } from "@/components/dashboard/applications-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Stats {
  total: number; applied: number; skipped: number; needsReview: number;
  errors: number; appliedToday: number; appliedThisWeek: number;
  topCompanies: Array<{ company: string; count: number }>;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/jobs?stats=true");
        const data = await res.json();
        setStats(data.stats);
      } catch { /* ignore */ }
    }
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  if (!stats) {
    return (
      <div className="space-y-6">
        <h2 className="text-3xl font-bold">Dashboard</h2>
        <p className="text-muted-foreground">Loading stats...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">Dashboard</h2>
      <StatsCards stats={stats} />
      <div className="grid gap-4 md:grid-cols-2">
        <ApplicationsChart data={[]} />
        <Card>
          <CardHeader><CardTitle>Top Companies</CardTitle></CardHeader>
          <CardContent>
            {stats.topCompanies.length === 0 ? (
              <p className="text-muted-foreground text-sm">No applications yet.</p>
            ) : (
              <div className="space-y-2">
                {stats.topCompanies.map((c) => (
                  <div key={c.company} className="flex justify-between text-sm">
                    <span>{c.company}</span>
                    <span className="text-muted-foreground">{c.count}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add src/components/dashboard/ src/app/page.tsx
git commit -m "feat: add dashboard home page with stats cards, chart, and top companies"
```

---

### Task 21: Dashboard - Applied Jobs Page

**Files:**
- Create: `src/components/jobs/job-table.tsx`, `src/components/jobs/job-filters.tsx`, `src/app/jobs/page.tsx`

- [ ] **Step 1: Create job filters**

`src/components/jobs/job-filters.tsx`:
```tsx
"use client";

import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface JobFiltersProps {
  search: string; status: string;
  onSearchChange: (v: string) => void; onStatusChange: (v: string) => void;
}

export function JobFilters({ search, status, onSearchChange, onStatusChange }: JobFiltersProps) {
  return (
    <div className="flex gap-4">
      <Input placeholder="Search jobs..." value={search} onChange={(e) => onSearchChange(e.target.value)} className="max-w-sm" />
      <Select value={status} onValueChange={onStatusChange}>
        <SelectTrigger className="w-[180px]"><SelectValue placeholder="All statuses" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          <SelectItem value="applied">Applied</SelectItem>
          <SelectItem value="skipped">Skipped</SelectItem>
          <SelectItem value="needs_review">Needs Review</SelectItem>
          <SelectItem value="error">Error</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
```

- [ ] **Step 2: Create job table**

`src/components/jobs/job-table.tsx`:
```tsx
"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { format } from "date-fns";

interface Job {
  id: number; title: string; company: string; location: string; url: string;
  status: string; skipReason: string | null; appliedAt: string; searchQuery: string;
}

export function JobTable({ jobs }: { jobs: Job[] }) {
  if (jobs.length === 0) {
    return <p className="text-muted-foreground text-sm py-8 text-center">No jobs found.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Title</TableHead>
          <TableHead>Company</TableHead>
          <TableHead>Location</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Query</TableHead>
          <TableHead></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {jobs.map((job) => (
          <TableRow key={job.id}>
            <TableCell className="font-medium">{job.title}</TableCell>
            <TableCell>{job.company}</TableCell>
            <TableCell>{job.location}</TableCell>
            <TableCell><StatusBadge status={job.status} /></TableCell>
            <TableCell className="text-muted-foreground">{format(new Date(job.appliedAt), "MMM d, yyyy")}</TableCell>
            <TableCell className="text-muted-foreground text-xs">{job.searchQuery}</TableCell>
            <TableCell>
              <a href={job.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline text-sm">View</a>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

- [ ] **Step 3: Implement jobs page**

`src/app/jobs/page.tsx`:
```tsx
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { JobTable } from "@/components/jobs/job-table";
import { JobFilters } from "@/components/jobs/job-filters";

export default function JobsPage() {
  const [jobs, setJobs] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");

  useEffect(() => {
    async function fetchJobs() {
      const params = new URLSearchParams();
      if (status !== "all") params.set("status", status);
      const res = await fetch(`/api/jobs?${params}`);
      const data = await res.json();
      setJobs(data.jobs);
      setTotal(data.total);
    }
    fetchJobs();
  }, [status]);

  const filteredJobs = search
    ? jobs.filter((j: any) =>
        j.title.toLowerCase().includes(search.toLowerCase()) ||
        j.company.toLowerCase().includes(search.toLowerCase())
      )
    : jobs;

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">Applied Jobs</h2>
      <JobFilters search={search} status={status} onSearchChange={setSearch} onStatusChange={setStatus} />
      <Card>
        <CardHeader><CardTitle className="text-sm text-muted-foreground">{total} total jobs</CardTitle></CardHeader>
        <CardContent><JobTable jobs={filteredJobs} /></CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/jobs/ src/app/jobs/
git commit -m "feat: add applied jobs page with searchable filterable table"
```

---

### Task 22: Dashboard - Needs Review Page

**Files:**
- Create: `src/app/review/page.tsx`

- [ ] **Step 1: Implement review page**

`src/app/review/page.tsx`:
```tsx
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { format } from "date-fns";
import { ExternalLink } from "lucide-react";

interface Job {
  id: number; title: string; company: string; location: string;
  url: string; status: string; skipReason: string | null; appliedAt: string;
}

export default function ReviewPage() {
  const [jobs, setJobs] = useState<Job[]>([]);

  useEffect(() => {
    fetch("/api/jobs?status=needs_review").then((r) => r.json()).then((d) => setJobs(d.jobs));
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">Needs Manual Review</h2>
      <p className="text-muted-foreground">These jobs had form fields the bot couldn&apos;t fill.</p>
      {jobs.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">No jobs need review.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <Card key={job.id}>
              <CardContent className="flex items-center justify-between py-4">
                <div className="space-y-1">
                  <div className="font-medium">{job.title}</div>
                  <div className="text-sm text-muted-foreground">{job.company} &middot; {job.location}</div>
                  {job.skipReason && <div className="text-xs text-orange-400">Reason: {job.skipReason}</div>}
                  <div className="text-xs text-muted-foreground">{format(new Date(job.appliedAt), "MMM d, yyyy h:mm a")}</div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={job.status} />
                  <a href={job.url} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm"><ExternalLink className="h-3 w-3 mr-1" />Apply</Button>
                  </a>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/review/
git commit -m "feat: add needs-review page for manual application queue"
```

---

### Task 23: Dashboard - Configuration Page

**Files:**
- Create: `src/components/config/search-config-form.tsx`, `src/components/config/profile-answers-form.tsx`, `src/components/config/credentials-form.tsx`, `src/app/config/page.tsx`

- [ ] **Step 1: Create search config form**

`src/components/config/search-config-form.tsx`:
```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Plus } from "lucide-react";

interface SearchConfig { id: number; keywords: string; location: string; remotePreference: string; experienceLevel: string; datePosted: string; isActive: boolean; }

export function SearchConfigForm({ configs, onRefresh }: { configs: SearchConfig[]; onRefresh: () => void }) {
  const [keywords, setKeywords] = useState("");
  const [location, setLocation] = useState("");
  const [remote, setRemote] = useState("any");
  const [experience, setExperience] = useState("senior");
  const [datePosted, setDatePosted] = useState("past_24_hours");

  async function handleAdd() {
    if (!keywords.trim()) return;
    await fetch("/api/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keywords: keywords.trim(), location: location.trim(), remotePreference: remote, experienceLevel: experience, datePosted }),
    });
    setKeywords(""); setLocation("");
    onRefresh();
  }

  async function handleDelete(id: number) {
    await fetch(`/api/config?id=${id}`, { method: "DELETE" });
    onRefresh();
  }

  return (
    <Card>
      <CardHeader><CardTitle>Search Configurations</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Keywords</Label><Input value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="QA Engineer" /></div>
          <div><Label>Location</Label><Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Remote" /></div>
          <div>
            <Label>Remote Preference</Label>
            <Select value={remote} onValueChange={setRemote}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="any">Any</SelectItem><SelectItem value="remote">Remote</SelectItem><SelectItem value="hybrid">Hybrid</SelectItem><SelectItem value="onsite">On-site</SelectItem></SelectContent></Select>
          </div>
          <div>
            <Label>Experience Level</Label>
            <Select value={experience} onValueChange={setExperience}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="entry">Entry</SelectItem><SelectItem value="mid">Mid</SelectItem><SelectItem value="senior">Senior</SelectItem></SelectContent></Select>
          </div>
          <div>
            <Label>Date Posted</Label>
            <Select value={datePosted} onValueChange={setDatePosted}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="past_24_hours">Past 24 hours</SelectItem><SelectItem value="past_week">Past week</SelectItem><SelectItem value="past_month">Past month</SelectItem><SelectItem value="any">Any time</SelectItem></SelectContent></Select>
          </div>
          <div className="flex items-end"><Button onClick={handleAdd} className="w-full"><Plus className="h-4 w-4 mr-1" /> Add Config</Button></div>
        </div>
        <div className="space-y-2 pt-4">
          {configs.map((c) => (
            <div key={c.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
              <div>
                <span className="font-medium">{c.keywords}</span>
                {c.location && <span className="text-muted-foreground"> &middot; {c.location}</span>}
                <span className="text-muted-foreground"> &middot; {c.remotePreference} &middot; {c.experienceLevel} &middot; {c.datePosted}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => handleDelete(c.id)}><Trash2 className="h-4 w-4 text-red-400" /></Button>
            </div>
          ))}
          {configs.length === 0 && <p className="text-muted-foreground text-sm text-center py-4">No search configs yet.</p>}
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Create profile answers form**

`src/components/config/profile-answers-form.tsx`:
```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Plus } from "lucide-react";

interface ProfileAnswer { id: number; fieldLabel: string; fieldType: string; answer: string; }

export function ProfileAnswersForm({ answers, onRefresh }: { answers: ProfileAnswer[]; onRefresh: () => void }) {
  const [fieldLabel, setFieldLabel] = useState("");
  const [fieldType, setFieldType] = useState("text");
  const [answer, setAnswer] = useState("");

  async function handleAdd() {
    if (!fieldLabel.trim() || !answer.trim()) return;
    await fetch("/api/config/profile-answers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fieldLabel: fieldLabel.trim(), fieldType, answer: answer.trim() }),
    });
    setFieldLabel(""); setAnswer("");
    onRefresh();
  }

  async function handleDelete(id: number) {
    await fetch(`/api/config/profile-answers?id=${id}`, { method: "DELETE" });
    onRefresh();
  }

  return (
    <Card>
      <CardHeader><CardTitle>Profile Answers</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div><Label>Field Label</Label><Input value={fieldLabel} onChange={(e) => setFieldLabel(e.target.value)} placeholder="Phone number" /></div>
          <div>
            <Label>Field Type</Label>
            <Select value={fieldType} onValueChange={setFieldType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="text">Text</SelectItem><SelectItem value="select">Dropdown</SelectItem><SelectItem value="radio">Radio</SelectItem><SelectItem value="checkbox">Checkbox</SelectItem><SelectItem value="textarea">Textarea</SelectItem><SelectItem value="file">File</SelectItem></SelectContent></Select>
          </div>
          <div className="flex items-end gap-2">
            <div className="flex-1"><Label>Answer</Label><Input value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="555-123-4567" /></div>
            <Button onClick={handleAdd}><Plus className="h-4 w-4" /></Button>
          </div>
        </div>
        <div className="space-y-2 pt-4">
          {answers.map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
              <div><span className="font-medium">{a.fieldLabel}</span> <span className="text-muted-foreground">({a.fieldType}) &rarr;</span> {a.answer}</div>
              <Button variant="ghost" size="sm" onClick={() => handleDelete(a.id)}><Trash2 className="h-4 w-4 text-red-400" /></Button>
            </div>
          ))}
          {answers.length === 0 && <p className="text-muted-foreground text-sm text-center py-4">No profile answers yet.</p>}
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: Create credentials form**

`src/components/config/credentials-form.tsx`:
```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, XCircle } from "lucide-react";

export function CredentialsForm({ hasCredentials, email, onRefresh }: { hasCredentials: boolean; email: string; onRefresh: () => void }) {
  const [inputEmail, setInputEmail] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!inputEmail.trim() || !password.trim()) return;
    setSaving(true);
    await fetch("/api/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: inputEmail.trim(), password }) });
    setInputEmail(""); setPassword(""); setSaving(false);
    onRefresh();
  }

  async function handleDelete() {
    await fetch("/api/session", { method: "DELETE" });
    onRefresh();
  }

  return (
    <Card>
      <CardHeader><CardTitle>LinkedIn Credentials</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {hasCredentials ? (
          <div className="flex items-center justify-between rounded-md border p-3">
            <div className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-400" /><span className="text-sm">Logged in as <strong>{email}</strong></span></div>
            <Button variant="destructive" size="sm" onClick={handleDelete}>Remove</Button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><XCircle className="h-4 w-4 text-red-400" /> No credentials saved</div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>LinkedIn Email</Label><Input type="email" value={inputEmail} onChange={(e) => setInputEmail(e.target.value)} placeholder="you@example.com" /></div>
              <div><Label>Password</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="********" /></div>
            </div>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save Credentials"}</Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 4: Implement config page**

`src/app/config/page.tsx`:
```tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { SearchConfigForm } from "@/components/config/search-config-form";
import { ProfileAnswersForm } from "@/components/config/profile-answers-form";
import { CredentialsForm } from "@/components/config/credentials-form";

export default function ConfigPage() {
  const [configs, setConfigs] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [session, setSession] = useState({ hasCredentials: false, email: "" });

  const fetchAll = useCallback(async () => {
    const [c, a, s] = await Promise.all([fetch("/api/config"), fetch("/api/config/profile-answers"), fetch("/api/session")]);
    setConfigs((await c.json()).configs);
    setAnswers((await a.json()).answers);
    setSession(await s.json());
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">Configuration</h2>
      <CredentialsForm hasCredentials={session.hasCredentials} email={session.email ?? ""} onRefresh={fetchAll} />
      <SearchConfigForm configs={configs} onRefresh={fetchAll} />
      <ProfileAnswersForm answers={answers} onRefresh={fetchAll} />
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add src/components/config/ src/app/config/
git commit -m "feat: add configuration page with search configs, profile answers, and credentials"
```

---

### Task 24: Dashboard - Automation Control Page

**Files:**
- Create: `src/components/automation/status-indicator.tsx`, `src/components/automation/control-buttons.tsx`, `src/app/automation/page.tsx`

- [ ] **Step 1: Create status indicator**

`src/components/automation/status-indicator.tsx`:
```tsx
"use client";

import { cn } from "@/lib/utils";

const statusConfig: Record<string, { color: string; label: string; pulse: boolean }> = {
  idle: { color: "bg-gray-400", label: "Idle", pulse: false },
  running: { color: "bg-green-400", label: "Running", pulse: true },
  paused: { color: "bg-yellow-400", label: "Paused", pulse: false },
  stopping: { color: "bg-orange-400", label: "Stopping...", pulse: true },
  error: { color: "bg-red-400", label: "Error", pulse: false },
  captcha_required: { color: "bg-purple-400", label: "2FA Required", pulse: true },
};

export function StatusIndicator({ status, currentJob }: { status: string; currentJob: string | null }) {
  const config = statusConfig[status] ?? statusConfig.idle;
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className={cn("h-3 w-3 rounded-full", config.color)} />
          {config.pulse && <div className={cn("absolute inset-0 h-3 w-3 animate-ping rounded-full opacity-75", config.color)} />}
        </div>
        <span className="text-lg font-semibold">{config.label}</span>
      </div>
      {currentJob && <p className="text-sm text-muted-foreground pl-6">{currentJob}</p>}
    </div>
  );
}
```

- [ ] **Step 2: Create control buttons**

`src/components/automation/control-buttons.tsx`:
```tsx
"use client";

import { Button } from "@/components/ui/button";
import { Play, Square } from "lucide-react";

export function ControlButtons({ status, onStart, onStop }: { status: string; onStart: () => void; onStop: () => void }) {
  const isRunning = status === "running" || status === "stopping";
  return (
    <div className="flex gap-3">
      <Button onClick={onStart} disabled={isRunning} className="bg-green-600 hover:bg-green-700"><Play className="h-4 w-4 mr-2" />Start Automation</Button>
      <Button onClick={onStop} disabled={!isRunning} variant="destructive"><Square className="h-4 w-4 mr-2" />Stop</Button>
    </div>
  );
}
```

- [ ] **Step 3: Implement automation page**

`src/app/automation/page.tsx`:
```tsx
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusIndicator } from "@/components/automation/status-indicator";
import { ControlButtons } from "@/components/automation/control-buttons";

interface AutoState { status: string; currentJob: string | null; appliedThisRun: number; skippedThisRun: number; errorsThisRun: number; startedAt: string | null; }

export default function AutomationPage() {
  const [state, setState] = useState<AutoState>({ status: "idle", currentJob: null, appliedThisRun: 0, skippedThisRun: 0, errorsThisRun: 0, startedAt: null });

  useEffect(() => {
    const poll = () => fetch("/api/automation").then((r) => r.json()).then(setState).catch(() => {});
    poll();
    const interval = setInterval(poll, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleStart = () => fetch("/api/automation", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "start" }) });
  const handleStop = () => fetch("/api/automation", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "stop" }) });

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">Automation Control</h2>
      <Card>
        <CardHeader><CardTitle>Status</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <StatusIndicator status={state.status} currentJob={state.currentJob} />
          <ControlButtons status={state.status} onStart={handleStart} onStop={handleStop} />
        </CardContent>
      </Card>
      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Applied This Run</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-green-400">{state.appliedThisRun}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Skipped This Run</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-yellow-400">{state.skippedThisRun}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Errors This Run</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-red-400">{state.errorsThisRun}</div></CardContent></Card>
      </div>
      {state.startedAt && <p className="text-sm text-muted-foreground">Started at: {new Date(state.startedAt).toLocaleString()}</p>}
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/automation/ src/app/automation/
git commit -m "feat: add automation control page with live status and start/stop controls"
```

---

### Task 25: Dashboard - Logs Page

**Files:**
- Create: `src/components/logs/log-viewer.tsx`, `src/components/logs/log-filters.tsx`, `src/app/logs/page.tsx`

- [ ] **Step 1: Create log filters**

`src/components/logs/log-filters.tsx`:
```tsx
"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export function LogFilters({ action, onActionChange, onExport }: { action: string; onActionChange: (v: string) => void; onExport: () => void }) {
  return (
    <div className="flex gap-4">
      <Select value={action} onValueChange={onActionChange}>
        <SelectTrigger className="w-[200px]"><SelectValue placeholder="All actions" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All actions</SelectItem>
          <SelectItem value="apply_success">Applied</SelectItem>
          <SelectItem value="apply_skip">Skipped</SelectItem>
          <SelectItem value="apply_error">Error</SelectItem>
          <SelectItem value="login_success">Login Success</SelectItem>
          <SelectItem value="login_fail">Login Failed</SelectItem>
          <SelectItem value="search_start">Search Start</SelectItem>
          <SelectItem value="search_results">Search Results</SelectItem>
          <SelectItem value="captcha_detected">CAPTCHA</SelectItem>
          <SelectItem value="automation_start">Bot Started</SelectItem>
          <SelectItem value="automation_stop">Bot Stopped</SelectItem>
        </SelectContent>
      </Select>
      <Button variant="outline" onClick={onExport}><Download className="h-4 w-4 mr-2" />Export for AI</Button>
    </div>
  );
}
```

- [ ] **Step 2: Create log viewer**

`src/components/logs/log-viewer.tsx`:
```tsx
"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface LogEntry { timestamp: string; action: string; job?: { title: string; company: string }; reason?: string; details?: Record<string, unknown>; durationMs?: number; }

const actionColors: Record<string, string> = {
  apply_success: "bg-green-500/20 text-green-400",
  apply_skip: "bg-orange-500/20 text-orange-400",
  apply_error: "bg-red-500/20 text-red-400",
  login_success: "bg-blue-500/20 text-blue-400",
  login_fail: "bg-red-500/20 text-red-400",
  search_start: "bg-purple-500/20 text-purple-400",
  search_results: "bg-purple-500/20 text-purple-400",
  automation_start: "bg-cyan-500/20 text-cyan-400",
  automation_stop: "bg-gray-500/20 text-gray-400",
};

export function LogViewer({ logs }: { logs: LogEntry[] }) {
  if (logs.length === 0) return <Card><CardContent className="py-8 text-center text-muted-foreground">No log entries yet.</CardContent></Card>;

  return (
    <div className="space-y-2">
      {logs.map((log, i) => (
        <Card key={i}>
          <CardContent className="py-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={actionColors[log.action] ?? ""}>{log.action}</Badge>
              <span className="text-xs text-muted-foreground">{format(new Date(log.timestamp), "MMM d, h:mm:ss a")}</span>
              {log.durationMs && <span className="text-xs text-muted-foreground">({(log.durationMs / 1000).toFixed(1)}s)</span>}
            </div>
            {log.job && <div className="text-sm mt-1"><span className="font-medium">{log.job.title}</span> <span className="text-muted-foreground">at {log.job.company}</span></div>}
            {log.reason && <div className="text-xs text-orange-400 mt-1">Reason: {log.reason}</div>}
            {log.details && <pre className="text-xs text-muted-foreground bg-muted/50 rounded p-2 mt-1 overflow-auto">{JSON.stringify(log.details, null, 2)}</pre>}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Implement logs page**

`src/app/logs/page.tsx`:
```tsx
"use client";

import { useEffect, useState } from "react";
import { LogViewer } from "@/components/logs/log-viewer";
import { LogFilters } from "@/components/logs/log-filters";

export default function LogsPage() {
  const [logs, setLogs] = useState([]);
  const [action, setAction] = useState("all");

  useEffect(() => {
    const fetchLogs = async () => {
      const params = new URLSearchParams();
      if (action !== "all") params.set("action", action);
      const res = await fetch(`/api/logs?${params}`);
      setLogs((await res.json()).logs);
    };
    fetchLogs();
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, [action]);

  const handleExport = () => {
    const params = new URLSearchParams({ export: "json" });
    if (action !== "all") params.set("action", action);
    window.open(`/api/logs?${params}`, "_blank");
  };

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">Automation Logs</h2>
      <LogFilters action={action} onActionChange={setAction} onExport={handleExport} />
      <LogViewer logs={logs} />
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/logs/ src/app/logs/
git commit -m "feat: add logs page with filterable viewer and AI export"
```

---

### Task 26: E2E Tests

**Files:**
- Create: `tests/e2e/dashboard.spec.ts`, `tests/e2e/configuration.spec.ts`, `tests/e2e/job-list.spec.ts`, `tests/e2e/automation-control.spec.ts`, `tests/e2e/log-viewer.spec.ts`

- [ ] **Step 1: Create E2E tests**

`tests/e2e/dashboard.spec.ts`:
```ts
import { test, expect } from "@playwright/test";

test.describe("Dashboard", () => {
  test("loads home page with stats cards", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h2")).toHaveText("Dashboard");
    await expect(page.locator("text=Total Applied")).toBeVisible();
  });

  test("sidebar navigation works", async ({ page }) => {
    await page.goto("/");
    await page.click("text=Applied Jobs");
    await expect(page).toHaveURL("/jobs");
    await page.click("text=Configuration");
    await expect(page).toHaveURL("/config");
    await page.click("text=Automation");
    await expect(page).toHaveURL("/automation");
    await page.click("text=Logs");
    await expect(page).toHaveURL("/logs");
  });
});
```

`tests/e2e/configuration.spec.ts`:
```ts
import { test, expect } from "@playwright/test";

test.describe("Configuration", () => {
  test("adds a search config", async ({ page }) => {
    await page.goto("/config");
    await page.fill('input[placeholder="QA Engineer"]', "SDET");
    await page.fill('input[placeholder="Remote"]', "New York");
    await page.click("text=Add Config");
    await expect(page.locator("text=SDET")).toBeVisible();
  });
});
```

`tests/e2e/job-list.spec.ts`:
```ts
import { test, expect } from "@playwright/test";

test.describe("Job List", () => {
  test("loads jobs page", async ({ page }) => {
    await page.goto("/jobs");
    await expect(page.locator("h2")).toHaveText("Applied Jobs");
    await expect(page.locator("text=All statuses")).toBeVisible();
  });
});
```

`tests/e2e/automation-control.spec.ts`:
```ts
import { test, expect } from "@playwright/test";

test.describe("Automation Control", () => {
  test("shows idle status by default", async ({ page }) => {
    await page.goto("/automation");
    await expect(page.locator("text=Idle")).toBeVisible();
    await expect(page.locator("text=Start Automation")).toBeVisible();
  });
});
```

`tests/e2e/log-viewer.spec.ts`:
```ts
import { test, expect } from "@playwright/test";

test.describe("Log Viewer", () => {
  test("loads logs page", async ({ page }) => {
    await page.goto("/logs");
    await expect(page.locator("h2")).toHaveText("Automation Logs");
    await expect(page.locator("text=Export for AI")).toBeVisible();
  });
});
```

- [ ] **Step 2: Run E2E tests**

```bash
npx playwright test tests/e2e/
```

Expected: All tests PASS.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/
git commit -m "feat: add E2E tests for all dashboard pages"
```

---

### Task 27: Automation Engine Tests with Mock Pages

**Files:**
- Create: `tests/mocks/*.html`, `tests/automation/*.spec.ts`

- [ ] **Step 1: Create mock HTML pages**

`tests/mocks/linkedin-login.html`:
```html
<!DOCTYPE html>
<html><body>
  <form id="login-form">
    <input id="username" type="text" placeholder="Email" />
    <input id="password" type="password" placeholder="Password" />
    <button type="submit">Sign in</button>
  </form>
</body></html>
```

`tests/mocks/easy-apply-single-step.html`:
```html
<!DOCTYPE html>
<html><body>
  <button class="jobs-apply-button" aria-label="Easy Apply">Easy Apply</button>
  <div id="modal" style="display:none">
    <div class="jobs-easy-apply-form-section__grouping">
      <label>Phone number</label>
      <input type="text" required aria-required="true" />
    </div>
    <button aria-label="Submit application">Submit</button>
  </div>
  <script>document.querySelector('.jobs-apply-button').onclick=()=>document.getElementById('modal').style.display='block';</script>
</body></html>
```

`tests/mocks/easy-apply-multi-step.html`:
```html
<!DOCTYPE html>
<html><body>
  <button class="jobs-apply-button">Easy Apply</button>
  <div id="modal" style="display:none">
    <div id="s1"><div class="jobs-easy-apply-form-section__grouping"><label>Phone</label><input type="text" required aria-required="true" /></div><button aria-label="Continue to next step">Next</button></div>
    <div id="s2" style="display:none"><div class="jobs-easy-apply-form-section__grouping"><label>Years of experience</label><select required><option value="">Select</option><option>1-3</option><option>4-6</option><option>7-9</option><option>10+</option></select></div><button aria-label="Submit application">Submit</button></div>
  </div>
  <script>document.querySelector('.jobs-apply-button').onclick=()=>document.getElementById('modal').style.display='block';document.querySelector('[aria-label="Continue to next step"]').onclick=()=>{document.getElementById('s1').style.display='none';document.getElementById('s2').style.display='block';};</script>
</body></html>
```

`tests/mocks/easy-apply-with-dropdowns.html`:
```html
<!DOCTYPE html>
<html><body>
  <button class="jobs-apply-button">Easy Apply</button>
  <div id="modal" style="display:none">
    <div class="jobs-easy-apply-form-section__grouping">
      <label>Work authorization</label>
      <fieldset role="radiogroup"><label><input type="radio" name="auth" value="yes" /> Yes</label><label><input type="radio" name="auth" value="no" /> No</label></fieldset>
    </div>
    <div class="jobs-easy-apply-form-section__grouping">
      <label>Experience level</label>
      <select required><option value="">Select</option><option>Entry level (0-2 years)</option><option>Mid level (3-5 years)</option><option>Senior level (6+ years)</option></select>
    </div>
    <button aria-label="Submit application">Submit</button>
  </div>
  <script>document.querySelector('.jobs-apply-button').onclick=()=>document.getElementById('modal').style.display='block';</script>
</body></html>
```

`tests/mocks/easy-apply-unknown-fields.html`:
```html
<!DOCTYPE html>
<html><body>
  <button class="jobs-apply-button">Easy Apply</button>
  <div id="modal" style="display:none">
    <div class="jobs-easy-apply-form-section__grouping">
      <label>Describe your testing philosophy</label>
      <textarea required aria-required="true"></textarea>
    </div>
    <button aria-label="Submit application">Submit</button>
  </div>
  <script>document.querySelector('.jobs-apply-button').onclick=()=>document.getElementById('modal').style.display='block';</script>
</body></html>
```

- [ ] **Step 2: Create automation tests**

`tests/automation/login-flow.spec.ts`:
```ts
import { test, expect } from "@playwright/test";
import path from "path";

test("fills login form on mock page", async ({ page }) => {
  await page.goto(`file://${path.resolve("tests/mocks/linkedin-login.html")}`);
  await page.fill("#username", "test@example.com");
  await page.fill("#password", "password123");
  expect(await page.inputValue("#username")).toBe("test@example.com");
  expect(await page.inputValue("#password")).toBe("password123");
});
```

`tests/automation/easy-apply-flow.spec.ts`:
```ts
import { test, expect } from "@playwright/test";
import path from "path";

test("completes single-step application", async ({ page }) => {
  await page.goto(`file://${path.resolve("tests/mocks/easy-apply-single-step.html")}`);
  await page.click(".jobs-apply-button");
  await page.waitForSelector("#modal", { state: "visible" });
  await page.locator(".jobs-easy-apply-form-section__grouping input").fill("555-123-4567");
  await page.click('[aria-label="Submit application"]');
});

test("completes multi-step application", async ({ page }) => {
  await page.goto(`file://${path.resolve("tests/mocks/easy-apply-multi-step.html")}`);
  await page.click(".jobs-apply-button");
  await page.locator("#s1 input").fill("555-123-4567");
  await page.click('[aria-label="Continue to next step"]');
  await page.waitForSelector("#s2", { state: "visible" });
  await page.selectOption("#s2 select", { label: "7-9" });
  await page.click('[aria-label="Submit application"]');
});
```

`tests/automation/skip-flow.spec.ts`:
```ts
import { test, expect } from "@playwright/test";
import path from "path";

test("detects unknown required field", async ({ page }) => {
  await page.goto(`file://${path.resolve("tests/mocks/easy-apply-unknown-fields.html")}`);
  await page.click(".jobs-apply-button");
  await page.waitForSelector("#modal", { state: "visible" });
  const textarea = page.locator(".jobs-easy-apply-form-section__grouping textarea");
  expect(await textarea.getAttribute("required")).not.toBeNull();
  expect(await textarea.inputValue()).toBe("");
});
```

`tests/automation/error-recovery.spec.ts`:
```ts
import { test, expect } from "@playwright/test";
import path from "path";

test("handles missing Easy Apply button", async ({ page }) => {
  await page.goto(`file://${path.resolve("tests/mocks/linkedin-login.html")}`);
  const btn = await page.$(".jobs-apply-button");
  expect(btn).toBeNull();
});

test("handles dropdowns and radio buttons", async ({ page }) => {
  await page.goto(`file://${path.resolve("tests/mocks/easy-apply-with-dropdowns.html")}`);
  await page.click(".jobs-apply-button");
  await page.click('label:has-text("Yes")');
  expect(await page.isChecked('input[value="yes"]')).toBe(true);
  await page.selectOption("select", { label: "Senior level (6+ years)" });
});
```

- [ ] **Step 3: Run automation tests**

```bash
npx playwright test tests/automation/
```

Expected: All tests PASS.

- [ ] **Step 4: Commit**

```bash
git add tests/mocks/ tests/automation/
git commit -m "feat: add automation engine tests with mock LinkedIn pages"
```

---

### Task 28: Integration Tests - DB Operations

**Files:**
- Create: `tests/integration/db/job-operations.test.ts`, `tests/integration/db/profile-answers.test.ts`

- [ ] **Step 1: Write DB tests**

`tests/integration/db/job-operations.test.ts`:
```ts
import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/db";

describe("Job DB Operations", () => {
  beforeEach(async () => { await prisma.job.deleteMany(); });

  it("creates a job record", async () => {
    const job = await prisma.job.create({
      data: { linkedinJobId: "t1", title: "QA", company: "Co", location: "R", url: "u", status: "applied", searchQuery: "QA" },
    });
    expect(job.id).toBeDefined();
  });

  it("enforces unique linkedinJobId", async () => {
    await prisma.job.create({ data: { linkedinJobId: "dup", title: "A", company: "A", location: "R", url: "u", status: "applied", searchQuery: "Q" } });
    await expect(prisma.job.create({ data: { linkedinJobId: "dup", title: "B", company: "B", location: "R", url: "u2", status: "applied", searchQuery: "Q" } })).rejects.toThrow();
  });

  it("upserts correctly", async () => {
    await prisma.job.create({ data: { linkedinJobId: "up1", title: "A", company: "A", location: "R", url: "u", status: "skipped", skipReason: "test", searchQuery: "Q" } });
    const updated = await prisma.job.upsert({
      where: { linkedinJobId: "up1" },
      create: { linkedinJobId: "up1", title: "A", company: "A", location: "R", url: "u", status: "applied", searchQuery: "Q" },
      update: { status: "applied", skipReason: null },
    });
    expect(updated.status).toBe("applied");
    expect(updated.skipReason).toBeNull();
  });
});
```

`tests/integration/db/profile-answers.test.ts`:
```ts
import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/db";
import { matchField } from "@/lib/field-matcher";

describe("Profile Answers DB + Field Matcher", () => {
  beforeEach(async () => { await prisma.profileAnswer.deleteMany(); });

  it("creates and retrieves profile answers", async () => {
    await prisma.profileAnswer.create({ data: { fieldLabel: "Phone", fieldType: "text", answer: "555" } });
    const answers = await prisma.profileAnswer.findMany();
    expect(answers).toHaveLength(1);
  });

  it("uses DB answers with field matcher", async () => {
    await prisma.profileAnswer.createMany({
      data: [
        { fieldLabel: "Phone number", fieldType: "text", answer: "555-1234" },
        { fieldLabel: "Website", fieldType: "text", answer: "https://jason-tur.com/" },
      ],
    });
    const dbAnswers = await prisma.profileAnswer.findMany();
    const answers = dbAnswers.map((a) => ({ fieldLabel: a.fieldLabel, fieldType: a.fieldType, answer: a.answer }));
    expect(matchField("Phone number", "text", answers)).toBe("555-1234");
    expect(matchField("Portfolio URL", "text", answers)).toBe("https://jason-tur.com/");
  });
});
```

- [ ] **Step 2: Run integration tests**

```bash
npx vitest run tests/integration/db/
```

Expected: All tests PASS.

- [ ] **Step 3: Commit**

```bash
git add tests/integration/db/
git commit -m "feat: add database integration tests for jobs and profile answers"
```

---

### Task 29: Final Integration - Run All Tests

- [ ] **Step 1: Run all unit tests**

```bash
npx vitest run
```

Expected: All unit and integration tests PASS.

- [ ] **Step 2: Run all E2E tests**

```bash
npx playwright test
```

Expected: All E2E and automation tests PASS.

- [ ] **Step 3: Run full build**

```bash
npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: LinkedIn Easy Apply bot - complete implementation with tests"
```
