"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MatchBadge } from "@/components/indeed/match-badge";
import { RequirementsList } from "@/components/indeed/requirements-list";
import { ExternalLink, ArrowLeft, Copy } from "lucide-react";
import Link from "next/link";

export default function IndeedJobDetailPage() {
  const params = useParams();
  const [job, setJob] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [canAutoApply, setCanAutoApply] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applyResult, setApplyResult] = useState<string | null>(null);

  useEffect(() => {
    if (params.id) {
      fetch(`/api/indeed/${params.id}`)
        .then((r) => r.json())
        .then((d) => {
          setJob(d.job);
          setCanAutoApply(Boolean(d.canAutoApply));
        });
    }
  }, [params.id]);

  if (!job) {
    return (
      <div className="space-y-6">
        <h2 className="text-3xl font-bold">Loading...</h2>
      </div>
    );
  }

  async function handleAutoApply() {
    setApplying(true);
    setApplyResult(null);
    try {
      const res = await fetch(`/api/jobs/${params.id}/apply`, { method: "POST" });
      const data = await res.json();
      setApplyResult(data.result?.outcome ?? data.error ?? "unknown");
    } catch {
      setApplyResult("failed");
    } finally {
      setApplying(false);
    }
  }

  function handleCopyUrl() {
    const url = job.applyUrl ?? job.url;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-6">
      <Link
        href="/indeed"
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Indeed Jobs
      </Link>

      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <h2 className="text-3xl font-bold">{job.title}</h2>
          <MatchBadge score={job.matchScore} />
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <span className="font-medium">{job.company}</span>
          <span>·</span>
          <span>{job.location}</span>
          {job.salary && (
            <>
              <span>·</span>
              <span>{job.salary}</span>
            </>
          )}
          {job.jobType && (
            <>
              <span>·</span>
              <Badge variant="secondary">{job.jobType}</Badge>
            </>
          )}
        </div>
      </div>

      {/* Match summary */}
      {job.matchSummary && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="text-4xl font-bold">
                {job.matchScore}
                <span className="text-lg text-muted-foreground">%</span>
              </div>
              <div className="text-sm text-muted-foreground">
                {job.matchSummary}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Apply button */}
      <div className="flex items-center gap-3">
        <a
          href={job.applyUrl ?? job.url}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonVariants({ size: "lg" })}
        >
          Apply Now
          <ExternalLink className="ml-2 h-4 w-4" />
        </a>
        <Button variant="outline" size="sm" onClick={handleCopyUrl}>
          <Copy className="mr-1 h-3 w-3" />
          {copied ? "Copied!" : "Copy URL"}
        </Button>
        {canAutoApply && (
          <Button size="lg" onClick={handleAutoApply} disabled={applying}>
            {applying ? "Applying…" : "Auto-Apply"}
          </Button>
        )}
        {applyResult && (
          <span className="text-sm text-muted-foreground">Result: {applyResult}</span>
        )}
        {job.applyUrl && (
          <span className="text-xs text-muted-foreground truncate max-w-[400px]">
            {job.applyUrl}
          </span>
        )}
      </div>

      {/* Requirements */}
      <Card>
        <CardHeader>
          <CardTitle>Requirements ({job.requirements?.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent>
          <RequirementsList requirements={job.requirements ?? []} />
        </CardContent>
      </Card>

      {/* Full description */}
      <Card>
        <CardHeader>
          <CardTitle>Full Description</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-sm">
            {job.descriptionRaw}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
