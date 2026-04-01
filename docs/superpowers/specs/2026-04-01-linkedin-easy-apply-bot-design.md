# LinkedIn Easy Apply Bot — Design Spec

## Overview

A web application that automatically applies to LinkedIn "Easy Apply" jobs matching configured search criteria. Built as a Next.js app with Playwright browser automation, SQLite storage, and a real-time dashboard for tracking applications.

**Target user:** Senior QA Automation Engineer who also does front-end development work.

**Default search keywords (configurable):**
- QA Engineer
- Quality Assurance Engineer
- Test Automation Engineer
- Automation Engineer
- SDET
- Software Development Engineer in Test
- Software Test Engineer
- QA Lead
- Senior Test Engineer
- Front End Developer
- Front End Engineer
- UI Developer
- React Developer
- JavaScript Developer
- Web Developer
- AI Engineer
- Prompt Engineer
- AI QA Engineer
- Machine Learning QA Engineer
- Software Engineer in Test
- DevOps Test Engineer
- CI/CD Engineer
- Release Engineer
- Tools Engineer
- Mobile Engineer

**Resume/portfolio website:** https://jason-tur.com/ (used as a profile answer when forms ask for a website or portfolio URL)

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js (App Router) |
| UI | React + Tailwind CSS + shadcn/ui |
| Automation | Playwright (Chromium) |
| Database | SQLite via Prisma ORM |
| Testing | Vitest (unit/integration) + Playwright Test (E2E) |
| Language | TypeScript throughout |

## Architecture

```
┌─────────────────────────────────────────────────┐
│              Next.js Web App                     │
│                                                  │
│  ┌──────────────┐     ┌──────────────────────┐  │
│  │  Dashboard UI │     │   API Routes         │  │
│  │  (React)      │◄───►│  /api/jobs           │  │
│  │               │     │  /api/config          │  │
│  │  - Stats      │     │  /api/session         │  │
│  │  - Job list   │     │  /api/automation      │  │
│  │  - Config     │     │  /api/logs            │  │
│  │  - Logs       │     └──────────┬───────────┘  │
│  └──────────────┘                 │              │
│                                   ▼              │
│                        ┌──────────────────────┐  │
│                        │  Automation Engine    │  │
│                        │  (Playwright)         │  │
│                        │                       │  │
│                        │  - Auth & session     │  │
│                        │  - Job search         │  │
│                        │  - Easy Apply flow    │  │
│                        │  - Form filling       │  │
│                        │  - Dropdown handling  │  │
│                        └──────────┬───────────┘  │
│                                   │              │
│                                   ▼              │
│                        ┌──────────────────────┐  │
│                        │  SQLite Database      │  │
│                        │  (via Prisma)         │  │
│                        │                       │  │
│                        │  - Applied jobs       │  │
│                        │  - Search configs     │  │
│                        │  - Profile answers    │  │
│                        │  - Automation logs    │  │
│                        └──────────────────────┘  │
│                                                  │
│  ┌──────────────────────────────────────────┐   │
│  │  File System                              │   │
│  │  - cookies/ (encrypted session cookies)   │   │
│  │  - logs/ (structured JSON logs)           │   │
│  │  - screenshots/ (error/skip captures)     │   │
│  └──────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

## Authentication Flow

1. **First run:** User provides LinkedIn email and password via the Configuration page. Playwright launches Chromium, navigates to LinkedIn login, types credentials, and submits.
2. **Cookie persistence:** On successful login, browser session cookies are saved to disk (encrypted). Stored in `cookies/linkedin-session.enc`.
3. **Subsequent runs:** Load saved cookies into the browser context. Verify session is valid by checking if LinkedIn loads without a login redirect.
   - **If valid:** Skip login, proceed directly to job search.
   - **If expired/invalid:** Fall back to username/password login, save fresh cookies.
4. **2FA/CAPTCHA handling:** If LinkedIn triggers a security challenge, the automation pauses and surfaces an alert on the dashboard. User handles the challenge manually in the browser window. Automation resumes once the challenge is cleared.

### Credential Storage

- LinkedIn email and password are stored encrypted in the SQLite database.
- Encryption key derived from a user-provided app password or environment variable.
- Cookies stored as encrypted files on disk.

## Automation Engine

### Job Search

1. Navigate to LinkedIn Jobs with configured search parameters:
   - Keywords (multiple queries supported, run sequentially)
   - Location / Remote / Hybrid / Onsite preference
   - Experience level (e.g., Senior)
   - "Easy Apply" filter enabled
   - Date posted filter (configurable: past 24 hours, past week, etc.)
2. Scrape job listings from search results.
3. Paginate through all available result pages.
4. Repeat for each configured search query.

### Easy Apply Flow

For each job found:

1. **Dedup check:** Look up job URL in SQLite. Skip if already applied or previously skipped.
2. **Click "Easy Apply"** to open the application modal.
3. **Step through the modal form:**
   - Detect all form fields in the current step (text inputs, textareas, selects, radio buttons, checkboxes, file uploads).
   - Match each field's label to pre-configured answers from the user's profile config.
   - **Text fields:** Type the matching answer.
   - **Dropdowns (`<select>` and custom LinkedIn dropdowns):** Identify the dropdown type, open it, find the closest matching option to the configured answer, and select it. Handle both native HTML selects and LinkedIn's custom typeahead/dropdown components.
   - **File uploads:** Attach the pre-configured resume file.
   - **Radio buttons / Checkboxes:** Select the matching option.
   - **Unknown/required fields:** If a required field can't be matched to any configured answer, skip the entire application. Log the job as "needs manual review" with the field label, field type, and a screenshot.
   - Click "Next" to advance through multi-step modals.
4. **Click "Submit application"** on the final step.
5. **Log the result** to SQLite and JSON log file.

### Rate Limiting & Human Mimicry

- **3-8 second** random delay between applications.
- **1-3 second** random delay between page interactions (clicks, typing).
- Random typing speed variation.
- Configurable maximum applications per session (default: 50).
- Configurable cooldown period between batches.

### Error Recovery

- If a form gets stuck, an unexpected modal appears, or a page fails to load: catch the error, take a screenshot, skip the job, log the error, and move to the next job.
- If the session appears invalidated mid-run: attempt re-login with stored credentials.
- If re-login fails: pause automation and alert the dashboard.

## Database Schema (Prisma)

### Job

| Field | Type | Description |
|---|---|---|
| id | Int (PK) | Auto-increment |
| linkedinJobId | String (unique) | LinkedIn's job ID from the URL |
| title | String | Job title |
| company | String | Company name |
| location | String | Job location |
| url | String | Full LinkedIn job URL |
| status | Enum | `applied`, `skipped`, `needs_review`, `error` |
| skipReason | String? | Why it was skipped (if applicable) |
| appliedAt | DateTime | When the application was submitted |
| searchQuery | String | Which search query found this job |
| createdAt | DateTime | Record creation time |

### SearchConfig

| Field | Type | Description |
|---|---|---|
| id | Int (PK) | Auto-increment |
| keywords | String | Search keywords |
| location | String | Location filter |
| remotePreference | Enum | `remote`, `hybrid`, `onsite`, `any` |
| experienceLevel | String | Experience level filter |
| datePosted | String | Date filter (past 24h, past week, etc.) |
| isActive | Boolean | Whether this config is used in automation runs |
| createdAt | DateTime | Record creation time |

### ProfileAnswer

| Field | Type | Description |
|---|---|---|
| id | Int (PK) | Auto-increment |
| fieldLabel | String | The form field label this answers (e.g., "Phone number") |
| fieldType | Enum | `text`, `select`, `radio`, `checkbox`, `file`, `textarea` |
| answer | String | The answer value |
| createdAt | DateTime | Record creation time |

### Credential

| Field | Type | Description |
|---|---|---|
| id | Int (PK) | Auto-increment |
| email | String | LinkedIn email (encrypted) |
| password | String | LinkedIn password (encrypted) |
| encryptionCheck | String | Validation token to verify correct decryption key |

## Dashboard UI

### Pages

**1. Home / Stats**
- Total applications sent (all time)
- Applied today / this week / this month
- Breakdown by status: applied, skipped, needs review, error
- Top companies applied to
- Applications over time chart

**2. Applied Jobs**
- Searchable, sortable, filterable table
- Columns: Job title, Company, Location, Date applied, Status, Link
- Filter by: status, date range, search query, company
- Click a row to see full details including log entries

**3. Needs Manual Review**
- Jobs that were skipped due to unknown required fields
- Shows: job title, company, link to apply, which field(s) couldn't be filled
- Screenshot preview of the stuck form
- Mark as "completed" after manual application

**4. Configuration**
- **Search Configs:** Add/edit/remove keyword + filter combinations
- **Profile Answers:** Pre-fill answers for common form fields (phone, years of experience, work authorization, etc.)
- **Credentials:** Set LinkedIn email/password (shown masked)
- **Resume:** Upload default resume file
- **Rate Limits:** Max applications per session, delay ranges

**5. Automation Control**
- Start / Stop / Pause the automation run
- Live status indicator ("Idle", "Searching...", "Applying to X at Y...", "Paused — 2FA required")
- Current session stats (applied this run, skipped this run, errors)
- Manual trigger to re-authenticate

**6. Logs**
- Browsable log viewer showing automation activity
- Filter by: date, action type, status
- Each entry shows timestamp, action, job details, result
- "Export for AI analysis" button — downloads the JSON log file

### UI Styling

- Tailwind CSS + shadcn/ui components
- Dark mode by default, light mode toggle
- Clean, minimal, data-focused dashboard aesthetic
- Responsive but primarily designed for desktop use

### Real-Time Updates

- Dashboard polls the API every 5 seconds during active automation runs to update stats and status.
- Automation control page polls every 2 seconds for tighter feedback.

## Structured Logging

All automation activity is logged in two places:

### 1. JSON Log Files (`logs/automation-YYYY-MM-DD.json`)

One file per day. Each line is a JSON object (JSONL format) for easy AI consumption:

```json
{
  "timestamp": "2026-04-01T14:32:01Z",
  "action": "apply_success",
  "job": {
    "linkedinJobId": "3912345678",
    "title": "Senior QA Automation Engineer",
    "company": "Acme Corp",
    "url": "https://linkedin.com/jobs/view/3912345678"
  },
  "details": {
    "searchQuery": "QA Automation Engineer",
    "formSteps": 3,
    "fieldsFilledAutomatically": 5
  },
  "duration_ms": 12400
}
```

```json
{
  "timestamp": "2026-04-01T14:33:15Z",
  "action": "apply_skip",
  "job": {
    "linkedinJobId": "3912345999",
    "title": "SDET Lead",
    "company": "TechCo",
    "url": "https://linkedin.com/jobs/view/3912345999"
  },
  "reason": "unknown_required_field",
  "details": {
    "fieldLabel": "Describe your testing philosophy",
    "fieldType": "textarea",
    "formStep": 2
  },
  "screenshot": "screenshots/2026-04-01T14-33-15-techco-sdet-lead.png"
}
```

Action types: `login_success`, `login_fail`, `login_cookie_reuse`, `search_start`, `search_results`, `apply_success`, `apply_skip`, `apply_error`, `session_expired`, `captcha_detected`, `automation_start`, `automation_stop`.

### 2. Database Log Table

Same data also stored in SQLite for dashboard queries. The JSON files serve as the AI-friendly export.

### Screenshots

- Captured on: errors, skipped applications, 2FA/CAPTCHA challenges.
- Stored in `screenshots/` with timestamp-based filenames.
- Referenced in log entries for correlation.

## Testing Strategy

### Unit Tests (Vitest)

- **Form field matcher:** Given a field label + type, returns the correct profile answer.
- **Dropdown handler:** Given a configured answer and a list of dropdown options, selects the best match.
- **Dedup logic:** Correctly identifies already-applied jobs.
- **Credential encryption/decryption:** Round-trip encrypt and decrypt.
- **Log formatter:** Produces valid JSONL entries.
- **Filter builder:** Constructs correct LinkedIn search URLs from config.
- **Data parsing:** Extracts job details (title, company, location, ID) from page elements.

### Integration Tests (Vitest + Prisma test DB)

- **API routes:** Full request/response cycle against a test SQLite database.
  - `POST /api/config` creates a search config.
  - `GET /api/jobs` returns applied jobs with correct filters.
  - `POST /api/automation/start` validates config before starting.
  - `GET /api/logs` returns structured log data.
- **Database operations:** Prisma queries correctly create, read, update job records and handle edge cases (duplicates, missing fields).
- **Profile answer CRUD:** Create, update, delete profile answers and verify they're returned correctly by the field matcher.

### E2E Tests (Playwright Test)

- **Dashboard loads:** All pages render without errors.
- **Configuration flow:** Add search config, add profile answers, save credentials — verify persisted.
- **Job list:** Mock data renders in the table, filters work, sorting works.
- **Automation control:** Start/stop buttons update status indicator.
- **Log viewer:** Displays log entries, filters work, export produces valid JSON.

### Automation Engine Tests (Playwright + Mock Pages)

- **Mock LinkedIn pages:** Local HTML files that mimic LinkedIn's Easy Apply modal structure (single-step, multi-step, with dropdowns, with unknown fields).
- **Login flow test:** Playwright fills credentials on mock login page, verifies cookie save/load.
- **Easy Apply flow test:** Steps through mock modal, fills fields, handles dropdowns, submits.
- **Skip flow test:** Encounters unknown required field on mock page, skips correctly, logs with screenshot.
- **Error recovery test:** Mock page throws an error mid-flow, automation recovers and moves on.

### Test Structure

```
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
```

## Project Structure

```
linkedin/
  src/
    app/
      page.tsx                    # Home / Stats dashboard
      jobs/
        page.tsx                  # Applied jobs table
      review/
        page.tsx                  # Needs manual review
      config/
        page.tsx                  # Configuration page
      automation/
        page.tsx                  # Automation control
      logs/
        page.tsx                  # Log viewer
      api/
        jobs/
          route.ts
        config/
          route.ts
        session/
          route.ts
        automation/
          route.ts
        logs/
          route.ts
      layout.tsx
      globals.css
    components/
      ui/                         # shadcn/ui components
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
      db.ts                       # Prisma client
      automation/
        engine.ts                 # Main automation orchestrator
        login.ts                  # Authentication logic
        search.ts                 # Job search & pagination
        apply.ts                  # Easy Apply flow
        form-filler.ts            # Field matching & filling
        dropdown-handler.ts       # Dropdown detection & selection
        screenshot.ts             # Screenshot capture
      logging/
        logger.ts                 # Structured JSON logger
        log-reader.ts             # Read/query log files
      encryption/
        crypto.ts                 # Credential & cookie encryption
      utils.ts                    # Shared utilities
  prisma/
    schema.prisma
    migrations/
  cookies/                        # Encrypted session cookies
  logs/                           # Daily JSON log files
  screenshots/                    # Error/skip screenshots
  tests/                          # Test structure as described above
  .env.example                    # Environment variable template
  next.config.ts
  tailwind.config.ts
  vitest.config.ts
  playwright.config.ts
  package.json
  tsconfig.json
```

## Security Considerations

- LinkedIn credentials and cookies are encrypted at rest.
- The encryption key is provided via environment variable (`ENCRYPTION_KEY`) — never hardcoded.
- `.env` file is in `.gitignore`.
- The app runs locally only — no external network exposure by default.
- Screenshots may contain sensitive information — stored locally, included in `.gitignore`.

## Out of Scope (for now)

- Resume customization per job.
- Cover letter generation.
- Job recommendation / AI matching.
- LinkedIn messaging or InMail automation.
- Multi-account support.
- Deployment to a server (local-only for now).
