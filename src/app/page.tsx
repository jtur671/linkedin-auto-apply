"use client";

import { useEffect, useState, useCallback } from "react";
import { StatChip } from "@/components/scout/stat-chip";
import { ActivityFeed } from "@/components/scout/activity-feed";
import {
  QueueCard,
  ReviewCard,
  type QueueJob,
  type ReviewJob,
} from "@/components/scout/queue-card";
import { cn } from "@/lib/utils";
import { CheckCircle2, CalendarDays, Sparkles, Radar } from "lucide-react";

interface Stats {
  appliedToday: number;
  appliedThisWeek: number;
}

export default function HomePage() {
  const [queue, setQueue] = useState<QueueJob[] | null>(null);
  const [reviews, setReviews] = useState<ReviewJob[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [foundToday, setFoundToday] = useState<number | null>(null);
  const [sourcesActive, setSourcesActive] = useState<number | null>(null);
  const [engineRunning, setEngineRunning] = useState(false);

  // LinkedIn Easy Apply engine (separate from the discovery sweep / status pill).
  const [linkedinStatus, setLinkedinStatus] = useState("idle");
  const [linkedinJob, setLinkedinJob] = useState<string | null>(null);

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

    // Discovery-sweep state drives the empty-state copy (resting vs looking).
    fetch("/api/indeed/scrape")
      .then((r) => r.json())
      .then((d) =>
        setEngineRunning(d.status === "running" || d.status === "stopping"),
      )
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

  const hasPicks = (queue?.length ?? 0) > 0 || reviews.length > 0;

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header className="space-y-1">
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          Your picks today 🎯
        </h1>
        <p className="text-muted-foreground">
          Scout lined these up for you. Go for it, or pass.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        {/* Left — the queue */}
        <section className="space-y-3" aria-label="Your picks">
          {queue === null ? (
            <QueueSkeleton />
          ) : !hasPicks ? (
            <EmptyState running={engineRunning} />
          ) : (
            <>
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
            </>
          )}
        </section>

        {/* Right — while you were away */}
        <aside className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <StatChip
              label="Applied today"
              value={stats?.appliedToday ?? null}
              icon={<CheckCircle2 className="size-3.5" />}
            />
            <StatChip
              label="This week"
              value={stats?.appliedThisWeek ?? null}
              icon={<CalendarDays className="size-3.5" />}
            />
            <StatChip
              label="Found today"
              value={foundToday}
              icon={<Sparkles className="size-3.5" />}
            />
            <StatChip
              label="Sources active"
              value={sourcesActive}
              icon={<Radar className="size-3.5" />}
            />
          </div>

          <ActivityFeed />

          <LinkedInAutoApplyCard
            status={linkedinStatus}
            currentJob={linkedinJob}
            onStatusChange={setLinkedinStatus}
          />
        </aside>
      </div>
    </div>
  );
}

function EmptyState({ running }: { running: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 px-6 py-16 text-center shadow-scout">
      <div className="text-4xl">{running ? "🔎" : "😴"}</div>
      <p className="mt-3 text-lg font-bold text-foreground">
        {running
          ? "No picks yet — Scout's still looking 🔎"
          : "Scout's resting — press start"}
      </p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        {running
          ? "New jobs land here the moment they're scored."
          : "Hit the start pill in the sidebar and Scout will go hunting."}
      </p>
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

// Preserves the old dashboard's LinkedIn Easy Apply start/stop. This is NOT the
// discovery sweep (that's the sidebar status pill) — it runs the LinkedIn
// auto-apply engine via /api/automation.
function LinkedInAutoApplyCard({
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
    <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-scout">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-extrabold text-foreground">
            LinkedIn auto-apply
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Easy Apply engine — runs separately from discovery.
          </p>
        </div>
        <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
          <span className="relative flex size-2.5">
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
          {labelFor(status)}
        </span>
      </div>

      {currentJob && (
        <p className="mt-2 truncate text-xs text-muted-foreground">
          On it: {currentJob}
        </p>
      )}

      <div className="mt-4 flex gap-2">
        <button
          onClick={start}
          disabled={isRunning}
          className="inline-flex flex-1 items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition-all hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
        >
          Start
        </button>
        <button
          onClick={stop}
          disabled={!isRunning}
          className="inline-flex flex-1 items-center justify-center rounded-full border border-border px-4 py-2 text-sm font-bold text-muted-foreground transition-all hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
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
