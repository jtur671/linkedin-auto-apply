"use client";
import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrapeControls } from "@/components/indeed/scrape-controls";
import { IndeedJobTable } from "@/components/indeed/indeed-job-table";
import { AlertCircle, Upload } from "lucide-react";
import Link from "next/link";

export default function IndeedPage() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [hasResume, setHasResume] = useState<boolean | null>(null);

  const fetchJobs = useCallback(async () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    const res = await fetch(`/api/indeed?${params}`);
    const data = await res.json();
    setJobs(data.jobs);
    setTotal(data.total);
  }, [search]);

  useEffect(() => {
    fetchJobs();
    fetch("/api/resume")
      .then((r) => r.json())
      .then((d) => setHasResume(!!d.resume));
    const interval = setInterval(fetchJobs, 5000);
    return () => clearInterval(interval);
  }, [fetchJobs]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">Indeed Jobs</h2>
      </div>

      {/* Start button - prominent at top */}
      <Card>
        <CardContent className="pt-6">
          <ScrapeControls />
        </CardContent>
      </Card>

      {/* Resume warning banner */}
      {hasResume === false && (
        <div className="flex items-center gap-3 rounded-md border border-amber-500/30 bg-amber-500/5 px-4 py-3">
          <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
          <div className="flex-1 text-sm">
            <span className="font-medium">Upload your resume for AI matching.</span>{" "}
            Without a resume, jobs won&apos;t get match scores.
          </div>
          <Link
            href="/config"
            className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            <Upload className="h-3 w-3" />
            Upload
          </Link>
        </div>
      )}

      {/* Search + jobs table */}
      <div className="space-y-4">
        <Input
          placeholder="Search jobs by title or company..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              {total} jobs scraped
            </CardTitle>
          </CardHeader>
          <CardContent>
            <IndeedJobTable jobs={jobs} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
