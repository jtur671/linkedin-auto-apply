"use client";
import { useEffect, useState } from "react";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { AdSlot } from "@/components/ads/ad-slot";
import { ApplicationsChart } from "@/components/dashboard/applications-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Stats { total: number; applied: number; skipped: number; needsReview: number; errors: number; appliedToday: number; appliedThisWeek: number; topCompanies: Array<{ company: string; count: number }>; }

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  useEffect(() => {
    const fetchStats = () => fetch("/api/jobs?stats=true").then(r => r.json()).then(d => setStats(d.stats)).catch(() => {});
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);
  if (!stats) return <div className="space-y-6"><h2 className="text-3xl font-bold">Dashboard</h2><p className="text-muted-foreground">Loading stats...</p></div>;
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">Dashboard</h2>
      <StatsCards stats={stats} />
      <AdSlot slot="dashboardMain" size="leaderboard" />
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
