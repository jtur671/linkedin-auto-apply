"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { MatchBadge } from "@/components/indeed/match-badge";
import { RequirementsList } from "@/components/indeed/requirements-list";
import { SourceChip } from "@/components/scout/source-chip";
import { outcomeCopy } from "@/lib/ui/outcome-copy";
import { ArrowLeft } from "lucide-react";

export default function JobDetailPage() {
  const params = useParams();
  const [job, setJob] = useState<any>(null);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);
  const [canAutoApply, setCanAutoApply] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applyResult, setApplyResult] = useState<string | null>(null);

  useEffect(() => {
    if (params.id) {
      fetch(`/api/indeed/${params.id}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.job) {
            setJob(d.job);
            setCanAutoApply(Boolean(d.canAutoApply));
          } else {
            setNotFound(true);
          }
        })
        .catch(() => setNotFound(true));
    }
  }, [params.id]);

  // ---- Auto-Apply behavior (preserved byte-for-byte from the indeed page) --
  async function handleAutoApply() {
    setApplying(true);
    setApplyResult(null);
    try {
      const res = await fetch(`/api/jobs/${params.id}/apply`, {
        method: "POST",
      });
      const data = await res.json();
      setApplyResult(data.result?.outcome ?? data.error ?? "unknown");
      // Once submitted, hide the button so a second click can't round-trip to a 409.
      if (data.result?.outcome === "submitted") setCanAutoApply(false);
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

  const backLink = (
    <Link
      href="/jobs"
      className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" />
      Back to jobs
    </Link>
  );

  if (notFound) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        {backLink}
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 px-6 py-16 text-center shadow-scout">
          <div className="text-4xl">🤔</div>
          <p className="mt-3 text-lg font-bold text-foreground">
            We couldn&apos;t find that job
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            It may have been removed. Head back to your list.
          </p>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        {backLink}
        <div className="h-8 w-1/2 rounded-full bg-muted" />
        <div className="h-32 rounded-2xl border border-border/60 bg-card shadow-scout" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {backLink}

      {/* Header */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            {job.title}
          </h1>
          <MatchBadge score={job.matchScore} />
        </div>
        <div className="flex flex-wrap items-center gap-2 text-muted-foreground">
          <SourceChip source={job.source} />
          <span className="font-semibold text-foreground">{job.company}</span>
          <span>·</span>
          <span>{job.location}</span>
          {job.salary && (
            <>
              <span>·</span>
              <span className="font-semibold text-secondary-foreground">
                {job.salary}
              </span>
            </>
          )}
          {job.jobType && (
            <>
              <span>·</span>
              <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-bold text-muted-foreground">
                {job.jobType}
              </span>
            </>
          )}
        </div>
        {job.applyOutcome && (
          <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-sm font-bold text-primary">
            {outcomeCopy(job.applyOutcome)}
          </span>
        )}
      </div>

      {/* Match summary */}
      {job.matchSummary && (
        <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-scout">
          <div className="flex items-start gap-4">
            <div className="text-4xl font-extrabold tabular-nums text-foreground">
              {job.matchScore}
              <span className="text-lg text-muted-foreground">%</span>
            </div>
            <p className="text-sm text-muted-foreground">{job.matchSummary}</p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-3">
        <a
          href={job.applyUrl ?? job.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-base font-bold text-primary-foreground transition-all hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Apply now ↗
        </a>
        {canAutoApply && (
          <button
            onClick={handleAutoApply}
            disabled={applying}
            className="inline-flex items-center justify-center rounded-full border border-primary bg-primary/10 px-6 py-3 text-base font-bold text-primary transition-all hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
          >
            {applying ? "Applying…" : "Let Scout apply"}
          </button>
        )}
        <button
          onClick={handleCopyUrl}
          className="inline-flex items-center justify-center rounded-full border border-border px-4 py-2 text-sm font-bold text-muted-foreground transition-all hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {copied ? "Copied!" : "Copy link"}
        </button>
        {applyResult && (
          <span className="text-sm font-semibold text-muted-foreground">
            {outcomeCopy(applyResult)}
          </span>
        )}
      </div>

      {/* Requirements */}
      <section className="rounded-2xl border border-border/60 bg-card p-5 shadow-scout">
        <h2 className="text-lg font-extrabold text-foreground">
          What they&apos;re looking for ({job.requirements?.length ?? 0})
        </h2>
        <div className="mt-4">
          <RequirementsList requirements={job.requirements ?? []} />
        </div>
      </section>

      {/* Full description */}
      <section className="rounded-2xl border border-border/60 bg-card p-5 shadow-scout">
        <h2 className="text-lg font-extrabold text-foreground">
          The full posting
        </h2>
        <div className="mt-4 whitespace-pre-wrap text-sm text-muted-foreground">
          {job.descriptionRaw}
        </div>
      </section>
    </div>
  );
}
