"use client";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ChevronDown, ChevronRight } from "lucide-react";

const actionColors: Record<string, string> = {
  apply_success: "bg-green-500/20 text-green-400 border-green-500/30",
  apply_skip: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  apply_error: "bg-red-500/20 text-red-400 border-red-500/30",
  login_success: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  login_fail: "bg-red-500/20 text-red-400 border-red-500/30",
  search_start: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  search_results: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  captcha_detected: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  automation_start: "bg-green-500/20 text-green-400 border-green-500/30",
  automation_stop: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

interface LogEntry {
  timestamp: string;
  action: string;
  jobTitle?: string;
  company?: string;
  reason?: string;
  details?: Record<string, unknown>;
}

function LogItem({ entry }: { entry: LogEntry }) {
  const [expanded, setExpanded] = useState(false);
  const hasDetails = entry.details && Object.keys(entry.details).length > 0;
  return (
    <Card>
      <CardContent className="py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <Badge variant="outline" className={`shrink-0 text-xs ${actionColors[entry.action] ?? ""}`}>{entry.action.replace(/_/g, " ")}</Badge>
            <div className="min-w-0 flex-1">
              {(entry.jobTitle || entry.company) && (
                <div className="text-sm font-medium truncate">{entry.jobTitle}{entry.company ? ` — ${entry.company}` : ""}</div>
              )}
              {entry.reason && <div className="text-xs text-muted-foreground">{entry.reason}</div>}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-muted-foreground">{format(new Date(entry.timestamp), "MMM d, h:mm:ss a")}</span>
            {hasDetails && (
              <button onClick={() => setExpanded(e => !e)} className="text-muted-foreground hover:text-foreground">
                {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
            )}
          </div>
        </div>
        {expanded && hasDetails && (
          <pre className="mt-2 text-xs text-muted-foreground bg-muted rounded p-2 overflow-auto max-h-40">
            {JSON.stringify(entry.details, null, 2)}
          </pre>
        )}
      </CardContent>
    </Card>
  );
}

export function LogViewer({ logs }: { logs: LogEntry[] }) {
  if (logs.length === 0) return <p className="text-muted-foreground text-sm py-8 text-center">No logs found.</p>;
  return (
    <div className="space-y-2">
      {logs.map((entry, i) => <LogItem key={i} entry={entry} />)}
    </div>
  );
}
