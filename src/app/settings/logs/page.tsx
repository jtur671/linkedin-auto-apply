"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { LogFilters } from "@/components/logs/log-filters";
import { LogViewer } from "@/components/logs/log-viewer";
import { ArrowLeft, Activity } from "lucide-react";

export default function SettingsLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [action, setAction] = useState("all");

  useEffect(() => {
    const fetchLogs = () => {
      const params = new URLSearchParams();
      if (action !== "all") params.set("action", action);
      fetch(`/api/logs?${params}`)
        .then((r) => r.json())
        .then((d) => setLogs(d.logs ?? []))
        .catch(() => {});
    };
    fetchLogs();
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, [action]);

  function handleExport() {
    window.open("/api/logs?export=json", "_blank");
  }

  return (
    <div className="space-y-6 max-w-4xl">

      {/* ── Back link ───────────────────────────────────────────── */}
      <Link
        href="/settings"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground
          hover:text-foreground transition-colors focus-visible:outline-none
          focus-visible:ring-2 focus-visible:ring-primary rounded"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Settings
      </Link>

      {/* ── Page header ─────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Activity className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
              Raw activity log
            </h1>
            <p className="text-sm text-muted-foreground">
              The unfiltered feed, for debugging.
            </p>
          </div>
        </div>
        <span className="shrink-0 rounded-full bg-muted border border-border px-3 py-1 text-sm font-semibold text-muted-foreground">
          {logs.length} {logs.length === 1 ? "entry" : "entries"}
        </span>
      </div>

      {/* ── Filters ─────────────────────────────────────────────── */}
      <LogFilters action={action} onActionChange={setAction} onExport={handleExport} />

      {/* ── Log table ───────────────────────────────────────────── */}
      <LogViewer logs={logs} />
    </div>
  );
}
