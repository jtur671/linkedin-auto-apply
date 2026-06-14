"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { activityCopy } from "@/lib/ui/outcome-copy";

interface LogEntry {
  timestamp: string;
  action: string;
  job?: { title?: string; company?: string };
  reason?: string;
  details?: Record<string, unknown>;
}

// Pull the company off either the structured job or the freeform details so
// activityCopy can name it ("🎉 Applied to Figma").
function detailsFor(entry: LogEntry): Record<string, unknown> {
  return {
    company: entry.job?.company,
    title: entry.job?.title,
    ...entry.details,
  };
}

const FEED_SIZE = 12;

export function ActivityFeed() {
  const [logs, setLogs] = useState<LogEntry[] | null>(null);

  useEffect(() => {
    let alive = true;
    const fetchLogs = () =>
      fetch(`/api/logs?limit=${FEED_SIZE}`)
        .then((r) => r.json())
        .then((d) => {
          if (alive) setLogs(Array.isArray(d.logs) ? d.logs : []);
        })
        .catch(() => {
          if (alive) setLogs((prev) => prev ?? []);
        });
    fetchLogs();
    const interval = setInterval(fetchLogs, 5000);
    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, []);

  // Newest first.
  const entries = logs ? [...logs].reverse() : null;

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-scout">
      <h3 className="text-base font-extrabold text-foreground">
        While you were away
      </h3>

      {entries === null ? (
        <ul className="mt-4 space-y-3" aria-hidden>
          {Array.from({ length: 4 }).map((_, i) => (
            <li key={i} className="flex items-center gap-3">
              <span className="size-2 shrink-0 rounded-full bg-muted" />
              <span className="h-3 flex-1 rounded-full bg-muted animate-pulse" />
            </li>
          ))}
        </ul>
      ) : entries.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Nothing yet — Scout&apos;s activity will show up here.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {entries.map((entry, i) => (
            <li
              key={`${entry.timestamp}-${i}`}
              className="flex items-start gap-3 text-sm"
              style={{
                animation: `feedEntryIn 0.35s ease-out ${Math.min(i, 6) * 40}ms backwards`,
              }}
            >
              <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary/60" />
              <div className="min-w-0 flex-1">
                <p className="text-foreground leading-snug">
                  {activityCopy(entry.action, detailsFor(entry))}
                </p>
                <p className="text-xs text-muted-foreground">
                  {relativeTime(entry.timestamp)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function relativeTime(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "";
  return formatDistanceToNow(date, { addSuffix: true });
}
