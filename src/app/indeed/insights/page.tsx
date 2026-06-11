"use client";
import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RequirementsChart } from "@/components/indeed/requirements-chart";

const CATEGORIES = [
  { value: "", label: "All" },
  { value: "technical_skill", label: "Technical" },
  { value: "experience", label: "Experience" },
  { value: "education", label: "Education" },
  { value: "certification", label: "Certifications" },
  { value: "soft_skill", label: "Soft Skills" },
];

export default function InsightsPage() {
  const [insights, setInsights] = useState<any[]>([]);
  const [totalJobs, setTotalJobs] = useState(0);
  const [category, setCategory] = useState("");

  const fetchInsights = useCallback(async () => {
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    params.set("limit", "25");
    const res = await fetch(`/api/indeed/insights?${params}`);
    const data = await res.json();
    setInsights(data.insights);
    setTotalJobs(data.totalJobs);
  }, [category]);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Job Insights</h2>
        <p className="text-muted-foreground mt-1">
          Most common requirements across {totalJobs} scraped Indeed jobs.
          {" "}
          <span className="text-emerald-600">✓</span> = you match,{" "}
          <span className="text-red-400">✗</span> = gap to address.
        </p>
      </div>

      <Tabs value={category} onValueChange={setCategory}>
        <TabsList>
          {CATEGORIES.map((c) => (
            <TabsTrigger key={c.value} value={c.value}>
              {c.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {CATEGORIES.map((c) => (
          <TabsContent key={c.value} value={c.value}>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">
                  Top {c.label === "All" ? "" : c.label + " "}requirements
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RequirementsChart insights={insights} />
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
