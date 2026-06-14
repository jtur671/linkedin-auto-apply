"use client";

import { useEffect, useState, type CSSProperties } from "react";
import Link from "next/link";
import { ScoreRing } from "@/components/scout/score-ring";
import { SourceChip } from "@/components/scout/source-chip";
import { cn } from "@/lib/utils";

// A DiscoveredJob row as returned by GET /api/indeed (list shape), trimmed to
// what the Found list renders. Extra fields on the API row are ignored.
export interface FoundJob {
  id: number;
  source: string;
  title: string;
  company: string;
  location: string;
  salary: string | null;
  matchScore: number | null;
  applyUrl: string | null;
  url: string;
  requirementsCount: number;
  scrapedAt: string;
}

// Staggered entrance, folded into a single `animation` shorthand so React never
// sees a shorthand+longhand mix in one style object.
function entranceStyle(index: number, settled: boolean): CSSProperties {
  if (!settled) return {};
  const delay = Math.min(index, 10) * 45;
  return {
    animation: `jobRowIn 0.4s cubic-bezier(0.22,1,0.36,1) ${delay}ms backwards`,
  };
}

// Returns true on the next frame after mount so the entrance always plays from
// its first keyframe.
function useMountSettle(): boolean {
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setSettled(true));
    return () => cancelAnimationFrame(id);
  }, []);
  return settled;
}

export function JobTable({ jobs }: { jobs: FoundJob[] }) {
  const settled = useMountSettle();

  return (
    <ul className="space-y-2.5">
      {jobs.map((job, i) => (
        <li
          key={job.id}
          style={entranceStyle(i, settled)}
          className={cn(!settled && "opacity-0")}
        >
          <article className="group relative rounded-2xl border border-border/60 bg-card p-4 shadow-scout transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-[0_8px_24px_oklch(0.511_0.096_186_/_0.12)]">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
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
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                  {job.salary && (
                    <span className="font-semibold text-secondary-foreground">
                      {job.salary}
                    </span>
                  )}
                  {job.requirementsCount > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {job.requirementsCount} requirement
                      {job.requirementsCount === 1 ? "" : "s"}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2.5">
                <ScoreRing score={job.matchScore} size={36} />
                <a
                  href={job.applyUrl ?? job.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center rounded-full border border-border px-3.5 py-1.5 text-xs font-bold text-muted-foreground transition-all hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {job.applyUrl ? "Apply ↗" : "View ↗"}
                </a>
              </div>
            </div>
          </article>
        </li>
      ))}
      <style>{`
        @keyframes jobRowIn {
          from { opacity: 0; transform: translateY(8px) scale(0.99); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </ul>
  );
}
