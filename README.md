<div align="center">

# 🟢 Scout

**My job search, on autopilot.**

Scout finds jobs across the web, scores them against my resume, and applies for me — so I spend my time on interviews, not job boards.

</div>

> **Personal project.** Scout is built for me, to get me a job. It isn't a product — there's no install-it-yourself path, no support, no public landing page. Everything runs locally on my machine.

---

## What it does

A pipeline: **discover → score → apply → review.**

- **Discover** — one sweep pulls listings from many sources by API: Adzuna, Remotive, RemoteOK, Himalayas, USAJOBS, and Hiring Cafe (which surfaces direct ATS apply links). New jobs are normalized into one shape and de-duped across sources by `(source, externalId)`.
- **Score** — an AI pass ranks each job against my resume + saved preferences and writes a match score + summary.
- **Apply** — for jobs an applier supports, Scout submits for me:
  - **Greenhouse** — via the board API, falling back to filling the hosted form in a browser.
  - **Lever** — fills the hosted form in a browser.
  - **LinkedIn Easy Apply** — drives a real Chromium session through multi-step forms, rate-limit aware.
  - **Ashby** — recognized and queued for me (no clean anonymous submit path yet).
- **Review** — anything it can't safely finish lands in a queue on Home for a one-tap "Your call."

Plus a **Profile** tool that audits my LinkedIn profile for recruiter keywords and rewrites sections (OpenAI or Gemini, my key).

## The app

Local web app at `http://localhost:3000`, four places:

| Page | What |
|---|---|
| **Home** | "Your picks today" queue + "while you were away" activity; the status pill starts/stops the discovery sweep |
| **Jobs** | Everything found / applied / passed, in tabs |
| **Profile** | Recruiter-SEO audit + section rewrites |
| **Settings** | Credentials, searches, answers, AI provider, resume, theme, raw logs |

## Run it

```bash
npm install
npx playwright install chromium
cp .env.example .env                 # fill in the keys below
npx prisma generate && npx prisma db push
npm run dev                          # http://localhost:3000
```

`.env` keys:
- `ENCRYPTION_KEY` — 32-byte hex for credentials at rest: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- `ADZUNA_APP_ID` / `ADZUNA_APP_KEY` / `ADZUNA_COUNTRY` — Adzuna search (free dev key)
- `USAJOBS_API_KEY` / `USAJOBS_USER_AGENT` — optional; the USAJOBS source is skipped if unset
- `AI_PROVIDER` (`openai` | `gemini`) + `AI_API_KEY` — match scoring + profile audits
- `DATABASE_URL` — local SQLite file (see `.env.example`)

First run, the onboarding wizard ("Hi, I'm Scout 👋") walks through credentials, searches, and answers.

## How it's built

- **Next.js 16 / React 19 / Tailwind 4**, **SQLite via Prisma**, **Playwright** for browser work, **TypeScript** throughout. Runs entirely local; the only outbound calls are to job-source APIs and my chosen AI provider.
- **Source-adapter contract** (`src/lib/sources/`) — every job site is a small plugin: a `JobSource` (search) and/or `JobApplier` (apply), registered in `registry.ts` and routed by URL host. Adding a site = one file, guarded by a reusable conformance suite.
- **LinkedIn Easy Apply engine** (`src/lib/automation/`) — cookie-first login (2FA/CAPTCHA aware), search + pagination, multi-step form filling with fuzzy field matching, rate-limit detection.
- **Scout UI** (`src/app`, `src/components/scout`) — the four pages above; plain-English status copy in `src/lib/ui/outcome-copy.ts`.
- **Design history** — the specs and step-by-step plans behind each milestone live in `docs/superpowers/specs` and `docs/superpowers/plans`.

## Tests

```bash
npm test                  # unit + integration (vitest)
npm run test:e2e          # Playwright UI flows
npm run test:automation   # browser fillers against local mock pages
```

No test ever submits a real application — a fetch guard blocks un-mocked network across the suite. Real submissions happen only when I use the app, or via the deliberate, opt-in `ALLOW_LIVE_APPLY` manual check.

## Roadmap

- **Done** — multi-source discovery, AI match scoring, Greenhouse / Lever / LinkedIn apply, and the Scout redesign.
- **Next (M3)** — hands-off engine: a scheduled sweep that auto-submits strong matches and queues the maybes (tiered), plus parallelizing the currently-sequential match scorer.
- **Later (M4)** — LinkedIn outreach: find recruiters for target roles, connect, send an AI-personalized note.

## Notes to self

- Single user, local, my own accounts — optimize for results; ban risk is low at my volume.
- Live-apply DOM selectors for Greenhouse/Lever hosted forms are unit-tested against mock forms; confirm against a real posting with `ALLOW_LIVE_APPLY=1` before trusting a new board.
- The old public-distribution scaffolding (installer scripts, `public/` landing, AdSense, MIT framing) is **paused** — left in the repo, no longer maintained.
