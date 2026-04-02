<div align="center">

# LinkedIn Auto Apply

**Stop applying manually. Let the bot do it.**

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org)
[![Playwright](https://img.shields.io/badge/Playwright-1.59-2EAD33?logo=playwright&logoColor=white)](https://playwright.dev)

A full-stack automation tool that applies to LinkedIn "Easy Apply" jobs for you — with a real-time dashboard, intelligent form filling, and zero cloud dependencies. Everything runs locally on your machine.

</div>

---

## How It Works

```
You configure it  -->  It searches LinkedIn  -->  It fills out forms  -->  You get interviews
```

1. Enter your LinkedIn credentials (encrypted locally with AES-256-GCM)
2. Set up search filters — job titles, location, remote preference, experience level
3. Pre-fill your common answers — phone, years of experience, work authorization, etc.
4. Hit **Start** on the dashboard and walk away

The bot opens a real Chromium browser, logs into LinkedIn, searches for matching Easy Apply jobs, fills out every form step, and submits. It skips jobs it can't fully fill and queues them for your manual review — with screenshots.

---

## What You Get

### Real-Time Dashboard
Live stats updating every 5 seconds — applications today, this week, all time, top companies, error counts. Start and stop automation right from the dashboard.

### Intelligent Form Filling
Handles text fields, dropdowns, radio buttons, checkboxes, file uploads, and LinkedIn's custom components. Uses fuzzy matching with 50+ label aliases so "Phone number", "Mobile phone", and "Your contact number" all resolve to the same answer.

### Smart Dropdown Matching
Matches your answers to dropdown options with fuzzy logic — including numeric range matching. Answer "5" and it'll correctly select "3-5 years" or "5+" from a dropdown.

### Cookie-First Auth
Logs in once, saves session cookies, reuses them on every subsequent run. No credentials sent unless the session expires. Handles 2FA and CAPTCHA detection — pauses and waits for you to complete the challenge.

### Rate Limit Detection
Detects LinkedIn's daily submission cap before and after clicking Apply. Stops automatically so your account stays safe. Human-like delays (5-12s between applications, 3-6s between searches) keep things under the radar.

### Needs Review Queue
Jobs with unknown form fields get flagged with screenshots showing exactly what the bot couldn't fill. One click to open the job on LinkedIn and apply manually.

### Structured Logging
Every action is logged as JSONL — timestamps, job details, durations, error reasons, screenshot paths. Export logs for analysis or feed them to an LLM.

### Guided Onboarding
4-step wizard with curated job category presets (QA, Engineering, Data, Product, Design) so you don't have to type common job titles manually.

---

## Quick Start

### Prerequisites

- Node.js 18+
- npm

### Install

```bash
git clone https://github.com/jtur671/linkedin-auto-apply.git
cd linkedin-auto-apply
npm install
npx playwright install chromium
```

### Configure

```bash
cp .env.example .env
```

Generate an encryption key and paste it into `.env`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Set Up Database

```bash
npx prisma generate
npx prisma db push
```

### Run

```bash
npm run dev
```

Open **http://localhost:3000** — the onboarding wizard will walk you through the rest.

---

## Dashboard Pages

| Page | What It Does |
|---|---|
| **Dashboard** | Live stats, top companies chart, start/stop automation |
| **Applied Jobs** | Searchable table of every application with status badges |
| **Needs Review** | Jobs the bot skipped — with screenshots and skip reasons |
| **Configuration** | Manage credentials, search filters, and profile answers |
| **Automation** | Detailed run view with live activity feed and session stats |
| **Logs** | Filterable log viewer with JSONL export |

---

## How the Automation Works

```
Engine starts
  |
  ├─ Login (cookies first, credentials fallback, 2FA/CAPTCHA wait)
  |
  ├─ For each search config:
  |    ├─ Build LinkedIn search URL with filters
  |    ├─ Paginate through results (up to 250 jobs per search)
  |    ├─ Filter to Easy Apply only
  |    └─ For each job:
  |         ├─ Dedup check (skip if already applied)
  |         ├─ Rate limit check (stop if capped)
  |         ├─ Click Easy Apply
  |         ├─ Fill form steps (up to 10 pages)
  |         ├─ Submit application
  |         └─ Log result + screenshot on failure
  |
  └─ Stop at 25 applications or rate limit
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI | React 19 + Tailwind CSS 4 + shadcn/ui |
| Automation | Playwright (Chromium) |
| Database | SQLite via Prisma ORM |
| Encryption | AES-256-GCM (credentials at rest) |
| Testing | Vitest + Playwright Test |
| Language | TypeScript |

Everything runs locally. No cloud services, no API keys, no subscription fees.

---

## Project Structure

```
src/
  app/                        # Pages and API routes
    api/                      # REST endpoints
    automation/               # Automation control page
    config/                   # Settings page
    jobs/                     # Applied jobs list
    logs/                     # Log viewer
    onboarding/               # Setup wizard
    review/                   # Manual review queue

  components/                 # React components
    automation/               # Live feed, status indicator, controls
    config/                   # Credential, search, profile forms
    dashboard/                # Stats cards, charts, badges
    onboarding/               # Wizard steps + progress bar
    ui/                       # shadcn/ui primitives

  lib/
    automation/
      engine.ts               # Main orchestrator
      login.ts                # Cookie-first auth + 2FA handling
      search.ts               # Job search + pagination
      apply.ts                # Easy Apply flow + rate limit detection
      form-filler.ts          # Multi-type form field handler
      dropdown-handler.ts     # Fuzzy dropdown option matching
      screenshot.ts           # Error screenshot capture
      state.ts                # In-memory run state
    logging/                  # Structured JSONL logger + reader
    encryption/               # AES-256-GCM crypto
    field-matcher.ts          # Fuzzy label matching with 50+ aliases
    filter-builder.ts         # LinkedIn search URL builder
    dedup.ts                  # Duplicate application prevention

prisma/schema.prisma          # 5 models: Job, SearchConfig, ProfileAnswer, Credential, AutomationLog
tests/                        # Unit, integration, E2E, and automation engine tests
```

---

## Testing

```bash
npm test                  # Unit + integration tests
npm run test:e2e          # End-to-end tests
npm run test:automation   # Automation engine tests against mock LinkedIn pages
```

---

## Disclaimer

This tool automates actions on LinkedIn. Use it responsibly and in accordance with LinkedIn's Terms of Service. The authors are not responsible for any consequences of using this tool, including account restrictions.

---

## License

MIT — see [LICENSE](LICENSE) for details.
