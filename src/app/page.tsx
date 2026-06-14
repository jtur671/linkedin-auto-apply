"use client";

import { useEffect, useState, useCallback, type CSSProperties } from "react";
import { formatDistanceToNow } from "date-fns";
import { ActivityFeed } from "@/components/scout/activity-feed";
import {
  QueueCard,
  ReviewCard,
  type QueueJob,
  type ReviewJob,
} from "@/components/scout/queue-card";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  Sparkles,
  Radar,
  Inbox,
  Play,
  Loader2,
  AlertTriangle,
} from "lucide-react";

interface Stats {
  appliedToday: number;
  appliedThisWeek: number;
}

interface AppliedRow {
  id: number;
  title: string;
  company: string;
  appliedAt?: string | null;
  createdAt?: string | null;
  url: string;
}

type ScrapeStatus = "idle" | "running" | "stopping" | "error";

export default function HomePage() {
  const [queue, setQueue] = useState<QueueJob[] | null>(null);
  const [reviews, setReviews] = useState<ReviewJob[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [foundToday, setFoundToday] = useState<number | null>(null);
  const [sourcesActive, setSourcesActive] = useState<number | null>(null);
  const [applied, setApplied] = useState<AppliedRow[] | null>(null);

  // Discovery sweep — drives the hero Run-a-sweep control + empty-state copy.
  const [sweepStatus, setSweepStatus] = useState<ScrapeStatus>("idle");
  const [sweepInflight, setSweepInflight] = useState(false);

  // LinkedIn Easy Apply engine (separate from the discovery sweep).
  const [linkedinStatus, setLinkedinStatus] = useState("idle");
  const [linkedinJob, setLinkedinJob] = useState<string | null>(null);

  // Time-of-day greeting. Computed after mount so SSR and the first client
  // render agree (new Date() at SSR vs hydration can otherwise diverge).
  const [greeting, setGreeting] = useState("Hello");
  useEffect(() => setGreeting(greetingForNow()), []);

  const refresh = useCallback(() => {
    fetch("/api/queue")
      .then((r) => r.json())
      .then((d) => setQueue(Array.isArray(d.jobs) ? d.jobs : []))
      .catch(() => setQueue((prev) => prev ?? []));

    fetch("/api/jobs?status=needs_review")
      .then((r) => r.json())
      .then((d) => setReviews(Array.isArray(d.jobs) ? d.jobs : []))
      .catch(() => {});

    fetch("/api/jobs?stats=true")
      .then((r) => r.json())
      .then((d) => setStats(d.stats ?? null))
      .catch(() => {});

    // No dedicated "found today" endpoint — derive it from the discovered-jobs
    // list (filter by scrapedAt within today).
    fetch("/api/indeed?limit=500&sortBy=date")
      .then((r) => r.json())
      .then((d) => {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const rows: Array<{ scrapedAt?: string }> = Array.isArray(d.jobs)
          ? d.jobs
          : [];
        setFoundToday(
          rows.filter((j) => j.scrapedAt && new Date(j.scrapedAt) >= start)
            .length,
        );
      })
      .catch(() => {});

    fetch("/api/sources")
      .then((r) => r.json())
      .then((d) => {
        const list: Array<{ configured?: boolean }> = Array.isArray(d.sources)
          ? d.sources
          : [];
        setSourcesActive(list.filter((s) => s.configured).length);
      })
      .catch(() => {});

    // Recently applied — LinkedIn rows, newest first (API already sorts).
    fetch("/api/jobs?status=applied&limit=8")
      .then((r) => r.json())
      .then((d) => setApplied(Array.isArray(d.jobs) ? d.jobs : []))
      .catch(() => setApplied((prev) => prev ?? []));

    // Discovery-sweep state drives the Run-a-sweep control + empty-state copy.
    fetch("/api/indeed/scrape")
      .then((r) => r.json())
      .then((d) => setSweepStatus((d.status as ScrapeStatus) ?? "idle"))
      .catch(() => {});

    fetch("/api/automation")
      .then((r) => r.json())
      .then((d) => {
        setLinkedinStatus(d.status ?? "idle");
        setLinkedinJob(d.currentJob ?? null);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, [refresh]);

  const removeFromQueue = useCallback((id: number) => {
    setQueue((prev) => (prev ? prev.filter((j) => j.id !== id) : prev));
  }, []);
  const removeReview = useCallback((id: number) => {
    setReviews((prev) => prev.filter((j) => j.id !== id));
  }, []);

  // Run-a-sweep: start when resting, stop while working — same contract as the
  // sidebar StatusPill (GET status, POST start/stop to /api/indeed/scrape).
  const toggleSweep = useCallback(async () => {
    if (sweepInflight) return;
    setSweepInflight(true);
    try {
      if (sweepStatus === "running" || sweepStatus === "stopping") {
        await fetch("/api/indeed/scrape", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "stop" }),
        });
        setSweepStatus("stopping");
      } else {
        await fetch("/api/indeed/scrape", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "start" }),
        });
        setSweepStatus("running");
      }
    } catch {
      // leave status as-is; the next poll reconciles
    } finally {
      setSweepInflight(false);
    }
  }, [sweepStatus, sweepInflight]);

  const sweepRunning = sweepStatus === "running" || sweepStatus === "stopping";

  const toReview = reviews.length + (queue?.length ?? 0);
  const noPicks = reviews.length === 0 && (queue?.length ?? 0) === 0;

  return (
    <div className="mx-auto max-w-6xl space-y-10">
      {/* ───────────────── ZONE 1 — Hero command strip ───────────────── */}
      <Hero
        greeting={greeting}
        toReview={toReview}
        appliedToday={stats?.appliedToday ?? null}
        foundToday={foundToday}
        sourcesActive={sourcesActive}
        sweepStatus={sweepStatus}
        sweepInflight={sweepInflight}
        onToggleSweep={toggleSweep}
        linkedinStatus={linkedinStatus}
        linkedinJob={linkedinJob}
        onLinkedinStatusChange={setLinkedinStatus}
      />

      {/* ───────────────── ZONE 2 — Needs you ───────────────── */}
      <section aria-label="Needs you" className="space-y-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold tracking-tight text-foreground">
              Needs you
            </h2>
            <p className="text-sm text-muted-foreground">
              Scout lined these up. Go for it, or pass.
            </p>
          </div>
          {!noPicks && queue !== null && (
            <span className="shrink-0 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold tabular-nums text-primary">
              {toReview} waiting
            </span>
          )}
        </div>

        {queue === null ? (
          <QueueSkeleton />
        ) : noPicks ? (
          <FirstRun
            running={sweepRunning}
            inflight={sweepInflight}
            onRunSweep={toggleSweep}
          />
        ) : (
          <div className="space-y-3">
            {reviews.map((job, i) => (
              <ReviewCard
                key={`review-${job.id}`}
                job={job}
                index={i}
                onRemove={removeReview}
              />
            ))}
            {(queue ?? []).map((job, i) => (
              <QueueCard
                key={job.id}
                job={job}
                index={reviews.length + i}
                onRemove={removeFromQueue}
              />
            ))}
          </div>
        )}
      </section>

      {/* ───────────────── ZONE 3 — Recently applied | Activity ───────────────── */}
      <section aria-label="Recap" className="grid gap-6 md:grid-cols-2">
        <RecentlyApplied rows={applied} />
        <ActivityFeed />
      </section>
    </div>
  );
}

/* ════════════════════ ZONE 1 ════════════════════ */

function Hero({
  greeting,
  toReview,
  appliedToday,
  foundToday,
  sourcesActive,
  sweepStatus,
  sweepInflight,
  onToggleSweep,
  linkedinStatus,
  linkedinJob,
  onLinkedinStatusChange,
}: {
  greeting: string;
  toReview: number;
  appliedToday: number | null;
  foundToday: number | null;
  sourcesActive: number | null;
  sweepStatus: ScrapeStatus;
  sweepInflight: boolean;
  onToggleSweep: () => void;
  linkedinStatus: string;
  linkedinJob: string | null;
  onLinkedinStatusChange: (s: string) => void;
}) {
  return (
    <header
      aria-label="Today at a glance"
      className="relative overflow-hidden rounded-2xl border border-border/60 bg-card p-6 shadow-scout sm:p-8"
      style={{ animation: "heroIn 0.5s cubic-bezier(0.22,1,0.36,1) backwards" }}
    >
      {/* soft emerald wash in the corner — command-center glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-primary/10 blur-3xl"
      />

      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            {greeting}, here&apos;s your morning 🎯
          </h1>
          <p className="mt-1 text-muted-foreground">
            Everything Scout lined up overnight, at a glance.
          </p>
        </div>
        <RunSweepButton
          status={sweepStatus}
          inflight={sweepInflight}
          onClick={onToggleSweep}
        />
      </div>

      {/* Big tabular-nums stat row */}
      <dl className="relative mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <HeroStat
          label="To review"
          value={toReview}
          icon={<Inbox className="size-4" />}
          index={0}
          emphasis={toReview > 0}
        />
        <HeroStat
          label="Applied today"
          value={appliedToday}
          icon={<CheckCircle2 className="size-4" />}
          index={1}
        />
        <HeroStat
          label="Found today"
          value={foundToday}
          icon={<Sparkles className="size-4" />}
          index={2}
        />
        <HeroStat
          label="Sources active"
          value={sourcesActive}
          icon={<Radar className="size-4" />}
          index={3}
        />
      </dl>

      <div className="relative mt-5">
        <LinkedInAutoApplyStrip
          status={linkedinStatus}
          currentJob={linkedinJob}
          onStatusChange={onLinkedinStatusChange}
        />
      </div>

      <style>{`
        @keyframes heroIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes heroStatIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </header>
  );
}

function HeroStat({
  label,
  value,
  icon,
  index,
  emphasis,
}: {
  label: string;
  value: number | null;
  icon: React.ReactNode;
  index: number;
  emphasis?: boolean;
}) {
  const display = value === null ? "—" : value;
  const style: CSSProperties = {
    animation: `heroStatIn 0.45s cubic-bezier(0.22,1,0.36,1) ${120 + index * 70}ms backwards`,
  };
  return (
    <div
      style={style}
      className={cn(
        "rounded-2xl border p-4 transition-colors",
        emphasis
          ? "border-primary/30 bg-primary/5"
          : "border-border/50 bg-muted/40",
      )}
    >
      <dt className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
        {icon}
        {label}
      </dt>
      <dd
        className={cn(
          "mt-1.5 text-3xl font-extrabold tabular-nums sm:text-4xl",
          emphasis ? "text-primary" : "text-foreground",
        )}
      >
        {display}
      </dd>
    </div>
  );
}

function RunSweepButton({
  status,
  inflight,
  onClick,
  size = "lg",
}: {
  status: ScrapeStatus;
  inflight: boolean;
  onClick: () => void;
  size?: "lg" | "md";
}) {
  const isRunning = status === "running" || status === "stopping";
  const isError = status === "error";

  return (
    <button
      onClick={onClick}
      disabled={inflight}
      aria-label={
        isRunning
          ? "Stop the sweep"
          : isError
            ? "Check activity"
            : "Run a sweep"
      }
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-2 rounded-full font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60",
        size === "lg" ? "px-6 py-3 text-base" : "px-5 py-2.5 text-sm",
        isError
          ? "border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
          : isRunning
            ? "bg-primary text-primary-foreground hover:bg-primary/90"
            : "bg-primary text-primary-foreground shadow-scout hover:bg-primary/90 hover:-translate-y-0.5",
      )}
    >
      {isRunning ? (
        <>
          <span className="relative flex size-2.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-current opacity-70" />
            <span className="relative inline-flex size-2.5 rounded-full bg-current" />
          </span>
          Working…
        </>
      ) : isError ? (
        <>
          <AlertTriangle className="size-4" />
          Check activity
        </>
      ) : (
        <>
          <Play className="size-4 fill-current" />
          Run a sweep
        </>
      )}
    </button>
  );
}

/* ════════════════════ ZONE 2 states ════════════════════ */

function FirstRun({
  running,
  inflight,
  onRunSweep,
}: {
  running: boolean;
  inflight: boolean;
  onRunSweep: () => void;
}) {
  if (running) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-primary/40 bg-primary/5 px-6 py-16 text-center shadow-scout">
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="mt-4 text-lg font-extrabold text-foreground">
          Scout&apos;s looking…
        </p>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          New picks land here the moment they&apos;re scored. Hang tight.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card px-6 py-16 text-center shadow-scout">
      <div className="text-4xl">🔎</div>
      <p className="mt-3 text-lg font-extrabold text-foreground">
        Scout hasn&apos;t looked yet
      </p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Run a sweep to fill your picks — Scout fans out across every active
        source and scores what it finds.
      </p>
      <div className="mt-6">
        <button
          onClick={onRunSweep}
          disabled={inflight}
          aria-label="Run a sweep"
          className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-7 py-3 text-base font-bold text-primary-foreground shadow-scout transition-all hover:-translate-y-0.5 hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
        >
          <Play className="size-4 fill-current" />
          Run a sweep
        </button>
      </div>
    </div>
  );
}

function QueueSkeleton() {
  return (
    <div className="space-y-3" aria-hidden>
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-border/60 bg-card p-4 shadow-scout"
        >
          <div className="h-4 w-2/3 rounded-full bg-muted" />
          <div className="mt-2 h-3 w-1/2 rounded-full bg-muted" />
          <div className="mt-4 flex gap-2">
            <div className="h-9 w-24 rounded-full bg-muted" />
            <div className="h-9 w-16 rounded-full bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ════════════════════ ZONE 3 — Recently applied ════════════════════ */

function RecentlyApplied({ rows }: { rows: AppliedRow[] | null }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-scout">
      <h3 className="text-base font-extrabold text-foreground">
        Recently applied
      </h3>

      {rows === null ? (
        <ul className="mt-4 space-y-3" aria-hidden>
          {Array.from({ length: 4 }).map((_, i) => (
            <li key={i} className="space-y-1.5">
              <span className="block h-3.5 w-2/3 rounded-full bg-muted animate-pulse" />
              <span className="block h-3 w-1/2 rounded-full bg-muted animate-pulse" />
            </li>
          ))}
        </ul>
      ) : rows.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Nothing applied yet — your applications will show up here.
        </p>
      ) : (
        <ul className="mt-4 space-y-1">
          {rows.map((job) => (
            <li key={job.id}>
              <a
                href={job.url}
                target="_blank"
                rel="noopener noreferrer"
                className="-mx-2 flex items-center justify-between gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold text-foreground">
                    {job.title}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {job.company}
                  </span>
                </span>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {appliedAgo(job.appliedAt ?? job.createdAt)}
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function appliedAgo(timestamp?: string | null): string {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "";
  return formatDistanceToNow(date, { addSuffix: true });
}

function greetingForNow(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

/* ════════════════════ LinkedIn auto-apply (secondary) ════════════════════ */

// Compact strip in the hero. This is NOT the discovery sweep — it runs the
// LinkedIn Easy Apply engine via /api/automation. Plainly labeled, secondary.
function LinkedInAutoApplyStrip({
  status,
  currentJob,
  onStatusChange,
}: {
  status: string;
  currentJob: string | null;
  onStatusChange: (s: string) => void;
}) {
  const isRunning = status === "running" || status === "stopping";

  async function start() {
    onStatusChange("running");
    await fetch("/api/automation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "start" }),
    }).catch(() => {});
  }

  async function stop() {
    onStatusChange("stopping");
    await fetch("/api/automation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "stop" }),
    }).catch(() => {});
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/50 bg-muted/40 px-4 py-3">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="relative flex size-2.5 shrink-0">
          {isRunning && (
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-70" />
          )}
          <span
            className={cn(
              "relative inline-flex size-2.5 rounded-full",
              isRunning ? "bg-primary" : "bg-muted-foreground/40",
            )}
          />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-bold text-foreground">
            LinkedIn auto-apply{" "}
            <span className="font-semibold text-muted-foreground">
              · {labelFor(status)}
            </span>
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {currentJob ? `On it: ${currentJob}` : "Easy Apply engine — runs separately from discovery."}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 gap-2">
        <button
          onClick={start}
          disabled={isRunning}
          className="inline-flex items-center justify-center rounded-full border border-primary/50 px-4 py-1.5 text-xs font-bold text-primary transition-all hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
        >
          Start
        </button>
        <button
          onClick={stop}
          disabled={!isRunning}
          className="inline-flex items-center justify-center rounded-full border border-border px-4 py-1.5 text-xs font-bold text-muted-foreground transition-all hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
        >
          Stop
        </button>
      </div>
    </div>
  );
}

function labelFor(status: string): string {
  switch (status) {
    case "running":
      return "Running";
    case "stopping":
      return "Stopping";
    case "error":
      return "Error";
    case "captcha":
      return "Captcha";
    default:
      return "Idle";
  }
}
