"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase, CheckCircle, AlertCircle, XCircle } from "lucide-react";

interface StatsData { total: number; applied: number; skipped: number; needsReview: number; errors: number; appliedToday: number; appliedThisWeek: number; }

export function StatsCards({ stats }: { stats: StatsData }) {
  const cards = [
    { title: "Total Applied", value: stats.applied, icon: CheckCircle, color: "text-green-400" },
    { title: "Applied Today", value: stats.appliedToday, icon: Briefcase, color: "text-blue-400" },
    { title: "This Week", value: stats.appliedThisWeek, icon: Briefcase, color: "text-purple-400" },
    { title: "Needs Review", value: stats.needsReview, icon: AlertCircle, color: "text-orange-400" },
    { title: "Skipped", value: stats.skipped, icon: XCircle, color: "text-yellow-400" },
    { title: "Errors", value: stats.errors, icon: XCircle, color: "text-red-400" },
  ];
  return (
    <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
            <card.icon className={`h-4 w-4 ${card.color}`} />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{card.value}</div></CardContent>
        </Card>
      ))}
    </div>
  );
}
