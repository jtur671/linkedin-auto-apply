"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

interface ScrapeState {
  status: "idle" | "running" | "stopping" | "error";
  phase: string | null;
  errors: number;
}

export function StatusPill() {
  const [state, setState] = useState<ScrapeState>({
    status: "idle",
    phase: null,
    errors: 0,
  });
  const [inflight, setInflight] = useState(false);

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch("/api/indeed/scrape");
      const data = await res.json();
      setState({
        status: data.status,
        phase: data.phase,
        errors: data.errors ?? 0,
      });
    } catch {
      // silently ignore — pill just stays at last known state
    }
  }, []);

  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, 5000);
    return () => clearInterval(interval);
  }, [fetchState]);

  async function handleClick() {
    if (inflight) return;
    setInflight(true);
    try {
      if (state.status === "idle" || state.status === "error") {
        await fetch("/api/indeed/scrape", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "start" }),
        });
        setState((prev) => ({ ...prev, status: "running", phase: "searching" }));
      } else if (state.status === "running" || state.status === "stopping") {
        await fetch("/api/indeed/scrape", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "stop" }),
        });
        setState((prev) => ({ ...prev, status: "stopping" }));
      }
    } finally {
      setInflight(false);
    }
  }

  const isRunning = state.status === "running" || state.status === "stopping";
  const isError = state.status === "error";

  return (
    <button
      onClick={handleClick}
      disabled={inflight}
      className={cn(
        "inline-flex w-full items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60",
        isError
          ? "border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
          : isRunning
            ? "bg-primary text-primary-foreground hover:bg-primary/90"
            : "border border-primary/50 bg-transparent text-primary hover:bg-primary/10",
      )}
      aria-label={isRunning ? "Stop Scout search" : isError ? "Check activity" : "Start Scout search"}
    >
      {isRunning ? (
        <>
          <span
            className="inline-block size-2 rounded-full bg-current"
            style={{ animation: "scout-pulse 1.5s ease-in-out infinite" }}
          />
          working
        </>
      ) : isError ? (
        <>
          <span>⚠</span>
          check activity
        </>
      ) : (
        <>
          <span>▶</span>
          start
        </>
      )}
      <style>{`
        @keyframes scout-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.75); }
        }
      `}</style>
    </button>
  );
}
