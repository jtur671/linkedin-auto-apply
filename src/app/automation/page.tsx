"use client";
import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusIndicator } from "@/components/automation/status-indicator";
import { ControlButtons } from "@/components/automation/control-buttons";
import { LiveFeed } from "@/components/automation/live-feed";
import { CheckCircle, XCircle, SkipForward, PartyPopper } from "lucide-react";

interface AutomationState {
  status: string;
  currentJob: string | null;
  applied: number;
  skipped: number;
  errors: number;
}

interface RunSummary {
  applied: number;
  skipped: number;
  errors: number;
}

export default function AutomationPage() {
  const [state, setState] = useState<AutomationState>({
    status: "idle",
    currentJob: null,
    applied: 0,
    skipped: 0,
    errors: 0,
  });
  const [runSummary, setRunSummary] = useState<RunSummary | null>(null);
  const prevStatusRef = useRef<string>("idle");

  useEffect(() => {
    const poll = () =>
      fetch("/api/automation")
        .then((r) => r.json())
        .then((data: AutomationState) => {
          setState(data);
          // Detect transition from running -> idle to show post-run summary
          if (prevStatusRef.current === "running" && data.status === "idle") {
            setRunSummary({
              applied: data.applied,
              skipped: data.skipped,
              errors: data.errors,
            });
          }
          prevStatusRef.current = data.status;
        })
        .catch(() => {});
    poll();
    const interval = setInterval(poll, 2000);
    return () => clearInterval(interval);
  }, []);

  async function handleStart() {
    setRunSummary(null);
    await fetch("/api/automation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "start" }),
    });
    setState((s) => ({ ...s, status: "running" }));
    prevStatusRef.current = "running";
  }

  async function handleStop() {
    await fetch("/api/automation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "stop" }),
    });
    setState((s) => ({ ...s, status: "stopping" }));
    prevStatusRef.current = "stopping";
  }

  const statCards = [
    { label: "Applied", value: state.applied, icon: CheckCircle, color: "text-green-400" },
    { label: "Skipped", value: state.skipped, icon: SkipForward, color: "text-yellow-400" },
    { label: "Errors", value: state.errors, icon: XCircle, color: "text-red-400" },
  ];

  const isRunning = state.status === "running";

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">Automation</h2>

      {/* Status + controls */}
      <Card>
        <CardHeader>
          <CardTitle>Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <StatusIndicator status={state.status} currentJob={state.currentJob} />
          <ControlButtons status={state.status} onStart={handleStart} onStop={handleStop} />
        </CardContent>
      </Card>

      {/* Stat cards */}
      <div className="grid gap-4 grid-cols-3">
        {statCards.map((card) => (
          <Card key={card.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.label} This Run
              </CardTitle>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tabular-nums">{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Post-run summary */}
      {runSummary && (
        <Card className="border-green-500/30 bg-green-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-green-400">
              <PartyPopper className="h-5 w-5" />
              Run Complete
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-3xl font-bold text-green-400 tabular-nums">{runSummary.applied}</div>
                <div className="text-xs text-muted-foreground mt-1">Applied</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-yellow-400 tabular-nums">{runSummary.skipped}</div>
                <div className="text-xs text-muted-foreground mt-1">Skipped</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-red-400 tabular-nums">{runSummary.errors}</div>
                <div className="text-xs text-muted-foreground mt-1">Errors</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Live activity feed */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Live Activity Feed</CardTitle>
        </CardHeader>
        <CardContent>
          <LiveFeed isRunning={isRunning} />
        </CardContent>
      </Card>
    </div>
  );
}
