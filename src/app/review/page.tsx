"use client";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { format } from "date-fns";
import { Check, ExternalLink, X } from "lucide-react";

interface Job { id: number; title: string; company: string; location: string; url: string; status: string; skipReason: string | null; appliedAt: string; }

export default function ReviewPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  useEffect(() => { fetch("/api/jobs?status=needs_review").then(r => r.json()).then(d => setJobs(d.jobs)); }, []);

  const markApplied = async (id: number) => {
    await fetch("/api/jobs", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status: "applied" }) });
    setJobs(prev => prev.filter(j => j.id !== id));
  };

  const dismiss = async (id: number) => {
    await fetch("/api/jobs", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status: "dismissed" }) });
    setJobs(prev => prev.filter(j => j.id !== id));
  };

  const dismissAll = async () => {
    await Promise.all(jobs.map(j => fetch("/api/jobs", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: j.id, status: "dismissed" }) })));
    setJobs([]);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Needs Manual Review</h2>
          <p className="text-muted-foreground">These jobs had form fields the bot couldn&apos;t fill.</p>
        </div>
        {jobs.length > 0 && <Button variant="outline" size="sm" onClick={dismissAll}><X className="h-3 w-3 mr-1" />Dismiss All</Button>}
      </div>
      {jobs.length === 0 ? <Card><CardContent className="py-8 text-center text-muted-foreground">No jobs need review.</CardContent></Card> : (
        <div className="space-y-3">{jobs.map(job => (
          <Card key={job.id}><CardContent className="flex items-center justify-between py-4">
            <div className="space-y-1">
              <div className="font-medium">{job.title}</div>
              <div className="text-sm text-muted-foreground">{job.company} &middot; {job.location}</div>
              {job.skipReason && <div className="text-xs text-orange-400">Reason: {job.skipReason}</div>}
              <div className="text-xs text-muted-foreground">{format(new Date(job.appliedAt), "MMM d, yyyy h:mm a")}</div>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={job.status} />
              <Button variant="outline" size="sm" onClick={() => markApplied(job.id)}><Check className="h-3 w-3 mr-1" />Applied</Button>
              <a href={job.url} target="_blank" rel="noopener noreferrer"><Button variant="outline" size="sm"><ExternalLink className="h-3 w-3 mr-1" />Apply</Button></a>
              <Button variant="ghost" size="sm" onClick={() => dismiss(job.id)} className="text-muted-foreground hover:text-red-400"><X className="h-4 w-4" /></Button>
            </div>
          </CardContent></Card>
        ))}</div>
      )}
    </div>
  );
}
