# Automation Safety-Hardening — Design

- **Date:** 2026-06-11
- **Status:** Approved (design); pending implementation plan
- **Scope owner:** job-application automation app (Next.js 16, Playwright, Prisma/SQLite)

## Context

The app automates job hunting against the user's **own logged-in** LinkedIn and Indeed
sessions via Playwright (search, scrape, Easy Apply), AI-scores matches, and auto-applies.

Deep research (2026-06-11, see memory `reference-linkedin-indeed-api-research`) established:

- **No official or safe non-browser path** exists for LinkedIn personal job search or Easy
  Apply. The Job Posting API / Apply Connect are employer/partner-gated; "Sign In with
  LinkedIn" is identity-only; the canonical reverse-engineered Voyager client
  (`tomquirk/linkedin-api`) is dead (repo 404s).
- The installed `linkedin` MCP (`linkedin-scraper-mcp` → `mcp-server-linkedin` →
  `stickerdaniel/linkedin-mcp-server`) is **Patchright browser automation** — same approach,
  same account-ban exposure as the current Playwright code. No benefit to switching.
- **Indeed offers an official MCP** (`docs.indeed.com/mcp/`) for individual job seekers —
  free beta, OAuth, **read-only** (search, job detail, the user's Indeed resume, company
  data). Sanctioned, so effectively zero account-ban risk for reads.
- A reverse-engineered HTTP client is **not safer** than a real browser for an authenticated
  personal account (distinct TLS/JA3 fingerprint); plausibly easier to detect.

## Goals

- Keep **all** current functionality (LinkedIn reads + Easy Apply, Indeed reads).
- **Reduce account-ban risk** — the user's top priority — by throttling hard and reacting to
  detection signals.
- Move **Indeed reads** to the official, sanctioned MCP where technically feasible.

## Non-goals (explicitly out of scope for this phase)

- Expanding to multi-source aggregation (ATS boards / Himalayas / Adzuna / USAJOBS).
- A product pivot away from auto-apply toward "rank + surface apply links."
- A config-page UI for safety settings or a "budget remaining" dashboard widget
  (possible fast-follow; not now).
- Rotating the unused LinkedIn OAuth secret in `auth_linkedin.py` (tracked separately).

## Decisions

1. **Objective:** safety-harden the existing app (smallest, safest change).
2. **LinkedIn posture:** keep reads **and** Easy Apply; throttle hard (pacing, jitter, daily
   caps), do not drop features.
3. **Safety layer shape:** a **centralized gatekeeper** — one module every platform action
   routes through — rather than scattered in-place fixes.
4. **Indeed:** swap reads to the official MCP if the standalone backend can drive it;
   otherwise keep Playwright but route it through the gatekeeper.

## Architecture — the gatekeeper "sandwich"

Today each engine calls Playwright actions directly with ad-hoc delays. Insert one safety
gatekeeper that every platform action routes through. It owns four concerns that are
currently scattered or missing: **pacing, budget, cooldown, detection.**

```
LinkedIn engine ─┐
                 ├─► gatekeeper.before() ─► [action] ─► gatekeeper.after()
Indeed fallback ─┘        │                                    │
                  budget + cooldown check,           record event, inspect
                  human pacing                        for detection → trip
```

## Components — new `src/lib/automation/safety/`

- **`pacing.ts`** — the single human-delay source replacing all six copies of `randomDelay`
  (currently in `engine.ts`, `apply.ts`, `search.ts`, `indeed/scrape-indeed.ts`,
  `indeed/search-indeed.ts`, `indeed/engine-indeed.ts`). API: `humanDelay(kind)` for
  `betweenActions | betweenApplies | betweenSearches | batchBreak`, with jitter and occasional
  longer "coffee break" pauses.
- **`budget.ts`** — persistent rolling-24h caps. `canPerform(platform, action)` /
  `record(platform, action)` / `remaining(platform, action)`. Fixes the current in-memory,
  per-run cap (`maxPerSession = 25` resets every run → multiple runs/day silently exceed
  LinkedIn's real daily limit).
- **`cooldown.ts`** — a circuit breaker. On a detection signal, `trip(platform, hours, reason)`;
  `isTripped(platform)` blocks new runs until expiry. Persisted, so a tripped account is not
  poked again after a process restart.
- **`detector.ts`** — centralizes the rate-limit/challenge string checks now split across
  `login.ts` and `apply.ts` into one classifier:
  `inspect(text | page) → "none" | "rate_limit" | "challenge" | "captcha"`.
- **`gatekeeper.ts`** — orchestrates the above; exposes `before(platform, action)` and
  `after(platform, action, page)` that the engines call.

## Data model — two small tables (via `db push`, matching current workflow)

```prisma
model ActionEvent {           // basis for rolling-24h budget
  id        Int      @id @default(autoincrement())
  platform  String   // "linkedin" | "indeed"
  action    String   // "search" | "view" | "apply"
  createdAt DateTime @default(now())
  @@index([platform, action, createdAt])
}

model SafetyState {           // persistent circuit breaker
  id            Int       @id @default(autoincrement())
  platform      String    @unique
  cooldownUntil DateTime?
  reason        String?
  updatedAt     DateTime  @updatedAt
}
```

Rolling-24h count = `ActionEvent.count where platform=?, action=?, createdAt > now-24h`.

**Default caps** (conservative config constants; not user-editable this phase):

- LinkedIn: ≈ **20 applies** and ≈ **30 searches** per rolling 24h. The Easy Apply daily cap
  the code already detects is the binding constraint.
- Indeed via MCP: uncapped (sanctioned). Indeed via Playwright fallback: a conservative
  scrape cap (exact number set during planning).

## Data flow — LinkedIn apply loop

1. `await gate.before("linkedin","apply")` → blocked if budget spent or cooling down (graceful
   stop with reason), else awaits human pacing.
2. `applyToJob(...)` runs.
3. `gate.after("linkedin","apply", page)` → records the event **and** inspects the modal/page;
   on any signal → `cooldown.trip()` + set state `captcha_required` and **break the run**.
   (Closes the current gap where mid-loop challenges are not detected — detection today lives
   only in `login.ts`.)

## Indeed plank — reads → official MCP

- **Step 0 — feasibility spike:** confirm the Next.js backend can drive the official Indeed
  MCP headlessly (reusable token vs. interactive Claude-connector OAuth).
- **If feasible:** replace `searchIndeed` / `scrapeIndeedJob` internals with MCP calls behind
  the unchanged `startIndeedScrape()` signature; downstream DB write + match-scoring untouched.
  Indeed reads become sanctioned, no Playwright, zero account-ban risk.
- **If not feasible:** Indeed stays on Playwright but routes through the gatekeeper, so it is
  throttled like LinkedIn. Either outcome is a net improvement.

## Error handling

- Budget spent → graceful stop, reason "daily cap reached" (not an error state).
- Cooldown active → refuse to start, surface "cooling down until X".
- Detection signal mid-run → immediate stop, trip cooldown, persist, surface in the existing
  live feed / `AutomationLog`.
- Indeed MCP unavailable → fall back to gated Playwright, log the fallback.

## Testing strategy

The gatekeeper deliberately pulls safety logic **out** of the browser path, so `budget`,
`cooldown`, `detector`, and `pacing` become pure, unit-testable modules:

- `budget` — rolling-window math with an injected clock; cap-boundary cases.
- `cooldown` — trip / still-tripped / expired transitions.
- `detector` — string → signal classification (rate-limit, challenge, captcha, none).
- `pacing` — delays fall within configured ranges; jitter bounded.
- One engine integration test with a mocked page asserting trip-and-break behavior.

All ride the existing vitest setup (no browser required). Integration tests use the isolated
`test.db` per the existing `vitest.config.ts` single-worker setup.

## Risks & open questions

1. **Indeed MCP feasibility (highest risk):** the official MCP authenticates via Claude's
   connector OAuth; driving it from a standalone Next.js backend is unproven. The spike
   resolves this before any swap work; the Playwright-through-gatekeeper fallback de-risks it.
2. **Caps are heuristics:** LinkedIn publishes no ban thresholds; defaults are conservative and
   may need tuning. Chosen low deliberately.
3. **Migrations:** project currently uses `prisma db push` with no migration history. This adds
   two tables the same way; a move to `prisma migrate` is noted but out of scope here.
4. **Ban risk is reduced, not eliminated:** automating a personal account inherently carries
   residual risk; this design lowers and reacts to it, it does not remove it.
