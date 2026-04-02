# LinkedIn Easy Apply Bot

A web application that automatically applies to LinkedIn "Easy Apply" jobs matching your search criteria. Built with Next.js, Playwright browser automation, SQLite storage, and a real-time dashboard.

## Features

- **Fully automatic** — configure your search filters, hit Start, walk away
- **Smart form filling** — handles text fields, dropdowns, radio buttons, file uploads, and LinkedIn's custom components
- **Cookie-first auth** — logs in once, reuses session cookies for faster subsequent runs
- **Dedup protection** — tracks every job in SQLite, never double-applies
- **Rate limit detection** — stops automatically when LinkedIn's daily cap is hit
- **Needs Review queue** — jobs with unknown form fields are logged with screenshots for manual follow-up
- **Structured logging** — JSONL log files designed for AI analysis
- **Dashboard** — real-time stats, job list, configuration, automation control, and log viewer

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js (App Router) |
| UI | React + Tailwind CSS + shadcn/ui |
| Automation | Playwright (Chromium) |
| Database | SQLite via Prisma ORM |
| Testing | Vitest (unit/integration) + Playwright Test (E2E) |
| Language | TypeScript |

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
git clone https://github.com/jtur671/linkedin-auto-apply.git
cd linkedin-auto-apply
npm install
npx playwright install chromium
```

### Environment Setup

Copy the example env file and set your encryption key:

```bash
cp .env.example .env
```

Generate a secure encryption key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Paste the output as the `ENCRYPTION_KEY` value in `.env`.

### Database Setup

```bash
npx prisma generate
npx prisma db push
```

### Run

```bash
npm run dev
```

Open http://localhost:3000

## Configuration

### 1. LinkedIn Credentials

Go to **Configuration** and enter your LinkedIn email and password. These are encrypted at rest using AES-256-GCM.

### 2. Search Configurations

Add keyword + filter combinations for the jobs you want to apply to. Each config includes:

- **Keywords** — job title to search (e.g., "QA Automation Engineer")
- **Location** — optional location filter
- **Remote Preference** — Remote, Hybrid, On-site, or Any
- **Experience Level** — Entry, Mid, or Senior
- **Date Posted** — Past 24 hours, Past week, Past month, or Any

### 3. Profile Answers

Pre-fill answers for common Easy Apply form fields:

- Phone number, email, website/portfolio URL
- Years of experience
- Work authorization, visa sponsorship
- Background check, drug test willingness
- Any other recurring form questions

The field matcher uses fuzzy matching with aliases, so "Phone number", "Mobile phone", and "Your phone number" all match the same answer.

### 4. Start Automation

Go to **Automation** and click **Start Automation**. The bot will:

1. Log into LinkedIn (cookies first, credentials as fallback)
2. Search for jobs using each active search config
3. Filter to Easy Apply jobs only
4. Apply to each job, filling forms with your profile answers
5. Skip jobs with unknown required fields (logged to Needs Review)
6. Stop at 25 applications per session or when rate-limited

## Dashboard Pages

| Page | Description |
|---|---|
| **Dashboard** | Stats overview — applied today/week/total, top companies, status breakdown |
| **Applied Jobs** | Searchable, filterable table of all applications |
| **Needs Review** | Jobs skipped due to unknown form fields — click to apply manually |
| **Configuration** | Manage credentials, search configs, and profile answers |
| **Automation** | Start/stop bot, live status indicator, session stats |
| **Logs** | Filterable log viewer with AI-friendly JSONL export |

## Rate Limits

LinkedIn limits daily Easy Apply submissions. The bot:

- Caps at **25 applications per session**
- Waits **5-12 seconds** between applications
- Waits **3-6 seconds** between search queries
- **Detects rate limit messages** and stops automatically
- Tracks all processed jobs so you can resume the next day

## Logging

Automation logs are saved in two places:

- **`logs/automation-YYYY-MM-DD.jsonl`** — structured JSONL files for AI analysis
- **Dashboard Logs page** — browsable log viewer with filters and export

Each log entry includes timestamp, action type, job details, duration, and any error/skip reasons. Screenshots are captured on errors and skips in `screenshots/`.

## Testing

```bash
# Unit + integration tests
npm test

# E2E tests (starts dev server automatically)
npm run test:e2e

# Automation engine tests (mock LinkedIn pages)
npm run test:automation
```

## Project Structure

```
src/
  app/                    # Next.js pages and API routes
  components/             # React components (dashboard, config, etc.)
  lib/
    automation/
      engine.ts           # Main orchestrator
      login.ts            # Cookie-first auth
      search.ts           # Job search + pagination
      apply.ts            # Easy Apply flow
      form-filler.ts      # Form field detection + filling
      dropdown-handler.ts # Dropdown option matching
      screenshot.ts       # Error screenshot capture
      state.ts            # In-memory automation state
    logging/              # Structured JSONL logger
    encryption/           # AES-256-GCM for credentials
    field-matcher.ts      # Fuzzy form label matching
    filter-builder.ts     # LinkedIn search URL builder
    data-parser.ts        # Job data extraction
    dedup.ts              # Duplicate application prevention
prisma/
  schema.prisma           # Database schema
tests/
  unit/                   # Vitest unit tests
  integration/            # API + DB integration tests
  e2e/                    # Playwright E2E tests
  automation/             # Mock LinkedIn page tests
  mocks/                  # Mock HTML pages
```

## License

MIT — see [LICENSE](LICENSE) for details.
