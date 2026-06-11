"use client";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Play, Square, Loader2 } from "lucide-react";

interface IndeedState {
  status: string;
  phase: string | null;
  searched: number;
  scraped: number;
  scored: number;
  total: number;
  errors: number;
}

export function ScrapeControls() {
  const [state, setState] = useState<IndeedState>({
    status: "idle",
    phase: null,
    searched: 0,
    scraped: 0,
    scored: 0,
    total: 0,
    errors: 0,
  });

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch("/api/indeed/scrape");
      const data = await res.json();
      setState(data);
    } catch {}
  }, []);

  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, 2000);
    return () => clearInterval(interval);
  }, [fetchState]);

  async function handleStart() {
    await fetch("/api/indeed/scrape", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "start" }),
    });
    setState((prev) => ({ ...prev, status: "running", phase: "searching" }));
  }

  async function handleStop() {
    await fetch("/api/indeed/scrape", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "stop" }),
    });
    setState((prev) => ({ ...prev, status: "stopping" }));
  }

  const isRunning = state.status === "running";
  const isStopping = state.status === "stopping";

  function getPhaseText() {
    if (!isRunning) return null;
    switch (state.phase) {
      case "searching":
        return `Searching Indeed... ${state.searched} jobs found`;
      case "scraping":
        return `Scraping details... ${state.scraped}/${state.total} jobs`;
      case "scoring":
        return `Scoring matches... ${state.scored}/${state.total}`;
      default:
        return "Starting...";
    }
  }

  return (
    <div className="flex items-center gap-4">
      {isRunning || isStopping ? (
        <Button
          size="lg"
          variant="destructive"
          onClick={handleStop}
          disabled={isStopping}
          className="min-w-[200px]"
        >
          {isStopping ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Stopping...
            </>
          ) : (
            <>
              <Square className="mr-2 h-4 w-4" />
              Stop Scraping
            </>
          )}
        </Button>
      ) : (
        <Button
          size="lg"
          onClick={handleStart}
          className="min-w-[200px]"
        >
          <Play className="mr-2 h-4 w-4" />
          Start Scraping Indeed
        </Button>
      )}

      {isRunning && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {getPhaseText()}
          {state.errors > 0 && (
            <span className="text-destructive">({state.errors} errors)</span>
          )}
        </div>
      )}

      {state.status === "error" && state.phase && (
        <div className="text-sm text-destructive">{state.phase}</div>
      )}
    </div>
  );
}
