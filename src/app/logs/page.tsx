"use client";
import { useEffect, useState } from "react";
import { LogFilters } from "@/components/logs/log-filters";
import { LogViewer } from "@/components/logs/log-viewer";

export default function LogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [action, setAction] = useState("all");

  useEffect(() => {
    const fetchLogs = () => {
      const params = new URLSearchParams();
      if (action !== "all") params.set("action", action);
      fetch(`/api/logs?${params}`).then(r => r.json()).then(d => setLogs(d.logs ?? [])).catch(() => {});
    };
    fetchLogs();
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, [action]);

  function handleExport() {
    window.open("/api/logs?export=json", "_blank");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">Logs</h2>
        <span className="text-sm text-muted-foreground">{logs.length} entries</span>
      </div>
      <LogFilters action={action} onActionChange={setAction} onExport={handleExport} />
      <LogViewer logs={logs} />
    </div>
  );
}
