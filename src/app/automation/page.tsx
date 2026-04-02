"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusIndicator } from "@/components/automation/status-indicator";
import { ControlButtons } from "@/components/automation/control-buttons";
import { CheckCircle, XCircle, SkipForward } from "lucide-react";
import { AdSlot } from "@/components/ads/ad-slot";

interface AutomationState {
  status: string;
  currentJob: string | null;
  applied: number;
  skipped: number;
  errors: number;
}

export default function AutomationPage() {
  const [state, setState] = useState<AutomationState>({ status: "idle", currentJob: null, applied: 0, skipped: 0, errors: 0 });

  useEffect(() => {
    const poll = () => fetch("/api/automation").then(r => r.json()).then(setState).catch(() => {});
    poll();
    const interval = setInterval(poll, 2000);
    return () => clearInterval(interval);
  }, []);

  async function handleStart() {
    await fetch("/api/automation", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "start" }) });
    setState(s => ({ ...s, status: "running" }));
  }

  async function handleStop() {
    await fetch("/api/automation", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "stop" }) });
    setState(s => ({ ...s, status: "stopping" }));
  }

  const statCards = [
    { label: "Applied", value: state.applied, icon: CheckCircle, color: "text-green-400" },
    { label: "Skipped", value: state.skipped, icon: SkipForward, color: "text-yellow-400" },
    { label: "Errors", value: state.errors, icon: XCircle, color: "text-red-400" },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">Automation</h2>
      <Card>
        <CardHeader><CardTitle>Status</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <StatusIndicator status={state.status} currentJob={state.currentJob} />
          <ControlButtons status={state.status} onStart={handleStart} onStop={handleStop} />
        </CardContent>
      </Card>
      <div className="grid gap-4 grid-cols-3">
        {statCards.map(card => (
          <Card key={card.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.label} This Run</CardTitle>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{card.value}</div></CardContent>
          </Card>
        ))}
      </div>
      <AdSlot slot="automationBottom" size="small" />
    </div>
  );
}
