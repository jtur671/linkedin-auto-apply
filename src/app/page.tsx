"use client";
import { useEffect, useState } from "react";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { ApplicationsChart } from "@/components/dashboard/applications-chart";
import { ControlButtons } from "@/components/automation/control-buttons";
import { StatusIndicator } from "@/components/automation/status-indicator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Stats { total: number; applied: number; skipped: number; needsReview: number; errors: number; appliedToday: number; appliedThisWeek: number; topCompanies: Array<{ company: string; count: number }>; }

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [automationStatus, setAutomationStatus] = useState("idle");
  const [currentJob, setCurrentJob] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = () => fetch("/api/jobs?stats=true").then(r => r.json()).then(d => setStats(d.stats)).catch(() => {});
    const fetchAutomation = () => fetch("/api/automation").then(r => r.json()).then(d => { setAutomationStatus(d.status); setCurrentJob(d.currentJob); }).catch(() => {});
    fetchStats();
    fetchAutomation();
    const interval = setInterval(() => { fetchStats(); fetchAutomation(); }, 5000);
    return () => clearInterval(interval);
  }, []);

  async function handleStart() {
    await fetch("/api/automation", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "start" }) });
    setAutomationStatus("running");
  }

  async function handleStop() {
    await fetch("/api/automation", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "stop" }) });
    setAutomationStatus("stopping");
  }

  if (!stats) return <div className="space-y-6"><h2 className="text-3xl font-bold">Dashboard</h2><p className="text-muted-foreground">Loading stats...</p></div>;
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">Dashboard</h2>
        <ControlButtons status={automationStatus} onStart={handleStart} onStop={handleStop} />
      </div>
      <StatusIndicator status={automationStatus} currentJob={currentJob} />
      <StatsCards stats={stats} />
      <div className="grid gap-4 md:grid-cols-2">
        <ApplicationsChart data={[]} />
        <Card>
          <CardHeader><CardTitle>Top Companies</CardTitle></CardHeader>
          <CardContent>
            {stats.topCompanies.length === 0 ? <p className="text-muted-foreground text-sm">No applications yet.</p> : (
              <div className="space-y-2">{stats.topCompanies.map(c => <div key={c.company} className="flex justify-between text-sm"><span>{c.company}</span><span className="text-muted-foreground">{c.count}</span></div>)}</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
