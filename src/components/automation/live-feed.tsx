"use client";

import { useEffect, useRef, useState } from "react";
import { formatDistanceToNow } from "date-fns";

interface LogJob {
  linkedinJobId: string;
  title: string;
  company: string;
  url: string;
}

interface LogEntry {
  timestamp: string;
  action: string;
  job?: LogJob;
  reason?: string;
  details?: Record<string, unknown>;
  durationMs?: number;
}

function actionMeta(action: string): { dot: string; label: string; textColor: string; bgColor: string } {
  switch (action) {
    case "applied":
      return { dot: "bg-green-400", label: "Applied", textColor: "text-green-400", bgColor: "bg-green-400/5 border-green-400/10" };
    case "skipped":
      return { dot: "bg-yellow-400", label: "Skipped", textColor: "text-yellow-400", bgColor: "bg-yellow-400/5 border-yellow-400/10" };
    case "error":
      return { dot: "bg-red-400 animate-pulse", label: "Error", textColor: "text-red-400", bgColor: "bg-red-400/5 border-red-400/10" };
    case "searching":
      return { dot: "bg-blue-400 animate-pulse", label: "Searching", textColor: "text-blue-400", bgColor: "bg-blue-400/5 border-blue-400/10" };
    case "session_start":
      return { dot: "bg-cyan-400", label: "Started", textColor: "text-cyan-400", bgColor: "bg-cyan-400/5 border-cyan-400/10" };
    case "session_end":
      return { dot: "bg-slate-400", label: "Ended", textColor: "text-slate-400", bgColor: "bg-slate-400/5 border-slate-400/10" };
    default:
      return { dot: "bg-slate-500", label: action, textColor: "text-slate-400", bgColor: "bg-slate-400/5 border-slate-400/10" };
  }
}

function formatTimestamp(ts: string): string {
  try {
    return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  } catch {
    return ts;
  }
}

function timeAgo(ts: string): string {
  try {
    return formatDistanceToNow(new Date(ts), { addSuffix: true });
  } catch {
    return "";
  }
}

interface LiveFeedProps {
  isRunning: boolean;
}

export function LiveFeed({ isRunning }: LiveFeedProps) {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [counter, setCounter] = useState(0);
  const [prevCount, setPrevCount] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [newEntryIds, setNewEntryIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;

    async function fetchLogs() {
      try {
        const res = await fetch("/api/logs?limit=50");
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        const fetched: LogEntry[] = data.logs ?? [];
        setEntries((prev) => {
          const newCount = fetched.length - prev.length;
          if (newCount > 0) {
            // Mark genuinely new entries for the flash animation
            const freshKeys = new Set(
              fetched.slice(-newCount).map((e) => e.timestamp + e.action)
            );
            setNewEntryIds(freshKeys);
            setTimeout(() => setNewEntryIds(new Set()), 1200);
          }
          return fetched;
        });
        setCounter(fetched.length);
      } catch {
        // silently ignore
      }
    }

    fetchLogs();
    const id = setInterval(fetchLogs, 3000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  // Running counter animation
  useEffect(() => {
    if (counter === prevCount) return;
    const step = counter > prevCount ? 1 : -1;
    const t = setInterval(() => {
      setPrevCount((p) => {
        if (p === counter) { clearInterval(t); return p; }
        return p + step;
      });
    }, 30);
    return () => clearInterval(t);
  }, [counter, prevCount]);

  // Auto-scroll to bottom when new entries arrive
  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [entries, autoScroll]);

  function handleScroll() {
    const el = containerRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    setAutoScroll(atBottom);
  }

  const appliedCount = entries.filter((e) => e.action === "applied").length;

  return (
    <div className="flex flex-col gap-3">
      {/* Feed header with counters */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            {isRunning && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            )}
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isRunning ? "bg-green-400" : "bg-slate-500"}`} />
          </span>
          <span className="text-sm font-medium text-foreground">
            {isRunning ? "Live Activity" : "Activity Log"}
          </span>
          {!autoScroll && (
            <button
              onClick={() => {
                setAutoScroll(true);
                bottomRef.current?.scrollIntoView({ behavior: "smooth" });
              }}
              className="text-xs text-blue-400 hover:text-blue-300 underline ml-2"
            >
              Resume auto-scroll
            </button>
          )}
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span>
            <span className="tabular-nums font-mono text-green-400 font-semibold">{appliedCount}</span>
            <span className="ml-1">applied</span>
          </span>
          <span>
            <span className="tabular-nums font-mono text-foreground font-semibold">{prevCount}</span>
            <span className="ml-1">events</span>
          </span>
        </div>
      </div>

      {/* Feed container */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-[420px] overflow-y-auto rounded-xl border border-border bg-card/50 backdrop-blur-sm"
        style={{ scrollbarWidth: "thin" }}
      >
        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
            <div className="text-4xl opacity-20">◉</div>
            <p className="text-sm">
              {isRunning ? "Waiting for activity…" : "No log entries yet. Start the automation to see live activity."}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border/50">
            {entries.map((entry, i) => {
              const key = entry.timestamp + entry.action;
              const meta = actionMeta(entry.action);
              const isNew = newEntryIds.has(key);
              return (
                <li
                  key={key + i}
                  className={`flex items-start gap-3 px-4 py-3 text-sm transition-colors duration-300 ${
                    isNew
                      ? "bg-foreground/[0.04]"
                      : "hover:bg-muted/30"
                  }`}
                  style={isNew ? { animation: "feedEntryIn 0.5s ease-out" } : undefined}
                >
                  {/* Dot */}
                  <div className="flex-shrink-0 mt-1">
                    <span className={`block h-2 w-2 rounded-full ${meta.dot}`} />
                  </div>

                  {/* Time */}
                  <div className="flex-shrink-0 w-20 text-xs text-muted-foreground font-mono pt-0.5">
                    {formatTimestamp(entry.timestamp)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-semibold uppercase tracking-wide ${meta.textColor}`}>
                        {meta.label}
                      </span>
                      {entry.job && (
                        <span className="text-foreground font-medium truncate">
                          {entry.job.title}
                          <span className="text-muted-foreground font-normal"> @ {entry.job.company}</span>
                        </span>
                      )}
                      {!entry.job && entry.details && (
                        <span className="text-muted-foreground text-xs truncate">
                          {String(Object.values(entry.details)[0] ?? "")}
                        </span>
                      )}
                    </div>
                    {entry.reason && (
                      <p className="text-xs text-muted-foreground/70 mt-0.5 truncate">
                        {entry.reason}
                      </p>
                    )}
                    {entry.durationMs !== undefined && (
                      <p className="text-[10px] text-muted-foreground/50 mt-0.5">
                        {entry.durationMs}ms
                      </p>
                    )}
                  </div>

                  {/* Time ago */}
                  <div className="flex-shrink-0 text-[10px] text-muted-foreground/40 pt-0.5 hidden sm:block">
                    {timeAgo(entry.timestamp)}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
