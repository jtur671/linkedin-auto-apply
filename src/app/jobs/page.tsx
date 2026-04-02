"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { JobTable } from "@/components/jobs/job-table";
import { JobFilters } from "@/components/jobs/job-filters";

export default function JobsPage() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  useEffect(() => {
    const params = new URLSearchParams();
    if (status !== "all") params.set("status", status);
    fetch(`/api/jobs?${params}`).then(r => r.json()).then(d => { setJobs(d.jobs); setTotal(d.total); });
  }, [status]);
  const filtered = search ? jobs.filter(j => j.title.toLowerCase().includes(search.toLowerCase()) || j.company.toLowerCase().includes(search.toLowerCase())) : jobs;
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">Applied Jobs</h2>
      <JobFilters search={search} status={status} onSearchChange={setSearch} onStatusChange={setStatus} />
      <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">{total} total jobs</CardTitle></CardHeader><CardContent><JobTable jobs={filtered} /></CardContent></Card>
    </div>
  );
}
