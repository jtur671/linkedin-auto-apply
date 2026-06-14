"use client";

import { useState, useEffect, type CSSProperties } from "react";
import Link from "next/link";
import { ScoreRing } from "@/components/scout/score-ring";
import { SourceChip } from "@/components/scout/source-chip";
import { outcomeCopy } from "@/lib/ui/outcome-copy";
import { cn } from "@/lib/utils";

// Shape returned by GET /api/queue (a DiscoveredJob row + canAutoApply).
export interface QueueJob {
  id: number;
  source: string;
  title: string;
  company: string;
  location: string;
  salary?: string | null;
  url: string;
  applyUrl?: string | null;
  matchScore: number | null;
  canAutoApply: boolean;
}

// A LinkedIn job the engine couldn't finish on its own — surfaced at the top of
// the queue as a "Your call" card. Shape mirrors the old /review rows.
export interface ReviewJob {
  id: number;
  title: string;
  company: string;
  location: string;
  url: string;
  skipReason?: string | null;
}

const EXIT_MS = 320;

// Shared card chrome: floats on the wash, lifts on hover, slides out on exit.
function cardShell(exiting: boolean, settled: boolean) {
  return cn(
    "group relative rounded-2xl border border-border/60 bg-card p-4 shadow-scout",
    "transition-all duration-300 ease-out",
    !exiting &&
      "hover:-translate-y-0.5 hover:shadow-[0_8px_24px_oklch(0.511_0.096_186_/_0.12)]",
    exiting && "pointer-events-none -translate-x-4 scale-[0.97] opacity-0",
    !settled && "opacity-0",
  );
}

// Staggered entrance as a single `animation` shorthand (delay folded in) so we
// never mix shorthand + longhand in the same style object — React warns on that.
function entranceStyle(index: number, settled: boolean): CSSProperties {
  if (!settled) return {};
  const delay = Math.min(index, 8) * 70;
  return {
    animation: `queueCardIn 0.45s cubic-bezier(0.22,1,0.36,1) ${delay}ms backwards`,
  };
}

function pillBase(primary: boolean) {
  return cn(
    "inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60",
    primary
      ? "bg-primary text-primary-foreground hover:bg-primary/90"
      : "border border-border text-muted-foreground hover:bg-muted hover:text-foreground",
  );
}

export function QueueCard({
  job,
  index,
  onRemove,
}: {
  job: QueueJob;
  index: number;
  onRemove: (id: number) => void;
}) {
  const [exiting, setExiting] = useState(false);
  const [applying, setApplying] = useState(false);
  const [outcome, setOutcome] = useState<string | null>(null);
  const [opened, setOpened] = useState(false);
  // A tiny mount flag so the staggered entrance always plays.
  const settled = useMountSettle();

  async function handleGo() {
    if (job.canAutoApply) {
      setApplying(true);
      try {
        const res = await fetch(`/api/jobs/${job.id}/apply`, { method: "POST" });
        const data = await res.json();
        setOutcome(outcomeCopy(data.result?.outcome ?? null));
      } catch {
        setOutcome(outcomeCopy("failed"));
      } finally {
        setApplying(false);
      }
    } else {
      window.open(job.applyUrl ?? job.url, "_blank", "noopener,noreferrer");
      setOpened(true);
    }
  }

  function handlePass() {
    setExiting(true);
    fetch(`/api/jobs/${job.id}/dismiss`, { method: "POST" }).catch(() => {});
    setTimeout(() => onRemove(job.id), EXIT_MS);
  }

  return (
    <article
      className={cardShell(exiting, settled)}
      style={entranceStyle(index, settled)}
    >
      <CardHead job={job} />

      <div className="mt-3.5 flex items-center gap-2">
        {outcome ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-4 py-2 text-sm font-bold text-primary">
            {outcome}
          </span>
        ) : opened ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-4 py-2 text-sm font-bold text-muted-foreground">
            Opened in a new tab ↗
          </span>
        ) : (
          <>
            <button
              onClick={handleGo}
              disabled={applying}
              className={pillBase(true)}
            >
              {applying ? "Applying…" : "Go for it"}
            </button>
            <button onClick={handlePass} className={pillBase(false)}>
              Pass
            </button>
          </>
        )}
      </div>

      <CardAnimStyles />
    </article>
  );
}

// A LinkedIn needs-review job rendered as a gentle "Your call" card at the top
// of the queue. No auto-apply — it links out to its detail/screenshot surface.
export function ReviewCard({
  job,
  index,
  onRemove,
}: {
  job: ReviewJob;
  index: number;
  onRemove: (id: number) => void;
}) {
  const [exiting, setExiting] = useState(false);
  const settled = useMountSettle();

  function handlePass() {
    setExiting(true);
    fetch("/api/jobs", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: job.id, status: "dismissed" }),
    }).catch(() => {});
    setTimeout(() => onRemove(job.id), EXIT_MS);
  }

  return (
    <article
      className={cn(cardShell(exiting, settled), "border-amber-300/50 bg-amber-50/40 dark:bg-amber-950/10")}
      style={entranceStyle(index, settled)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate font-bold text-foreground">{job.title}</h3>
            <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
              Your call
            </span>
            <SourceChip source="linkedin" />
          </div>
          <p className="mt-1 truncate text-sm text-muted-foreground">
            {job.company} · {job.location}
          </p>
          {job.skipReason && (
            <p className="mt-1 text-xs text-muted-foreground">
              Scout paused here: {job.skipReason}
            </p>
          )}
        </div>
      </div>

      <div className="mt-3.5 flex items-center gap-2">
        <a
          href={job.url}
          target="_blank"
          rel="noopener noreferrer"
          className={pillBase(true)}
        >
          Take a look ↗
        </a>
        <button onClick={handlePass} className={pillBase(false)}>
          Pass
        </button>
      </div>

      <CardAnimStyles />
    </article>
  );
}

function CardHead({ job }: { job: QueueJob }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/jobs/${job.id}`}
            className="truncate font-bold text-foreground hover:underline focus-visible:underline focus-visible:outline-none"
          >
            {job.title}
          </Link>
          <SourceChip source={job.source} />
        </div>
        <p className="mt-1 truncate text-sm text-muted-foreground">
          {job.company} · {job.location}
        </p>
        {job.salary && (
          <p className="mt-1 text-sm font-semibold text-secondary-foreground">
            {job.salary}
          </p>
        )}
      </div>
      <div className="shrink-0">
        <ScoreRing score={job.matchScore} />
      </div>
    </div>
  );
}

function CardAnimStyles() {
  return (
    <style>{`
      @keyframes queueCardIn {
        from { opacity: 0; transform: translateY(10px) scale(0.985); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }
    `}</style>
  );
}

// Returns true on the next tick after mount so CSS entrance animations always
// fire from their initial keyframe.
function useMountSettle(): boolean {
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setSettled(true));
    return () => cancelAnimationFrame(id);
  }, []);
  return settled;
}
