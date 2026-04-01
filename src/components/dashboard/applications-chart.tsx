"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface ChartData { date: string; applied: number; }

export function ApplicationsChart({ data }: { data: ChartData[] }) {
  return (
    <Card>
      <CardHeader><CardTitle>Applications Over Time</CardTitle></CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-muted-foreground text-sm py-8 text-center">No application data yet. Start the automation to see stats.</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <XAxis dataKey="date" stroke="#888" fontSize={12} />
              <YAxis stroke="#888" fontSize={12} />
              <Tooltip contentStyle={{ backgroundColor: "#1c1c1c", border: "1px solid #333" }} />
              <Bar dataKey="applied" fill="#22c55e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
