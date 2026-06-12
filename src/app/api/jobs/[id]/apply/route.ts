import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { applierFor } from "@/lib/sources/registry";
import { assembleApplicantProfile } from "@/lib/sources/profile";
import type { NormalizedJob } from "@/lib/sources/types";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const jobId = parseInt(id);
  if (isNaN(jobId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const row = await prisma.discoveredJob.findUnique({ where: { id: jobId } });
  if (!row) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  // Don't fire a duplicate application at the same employer.
  if (row.applyOutcome === "submitted") {
    return NextResponse.json({ error: "Already applied to this job" }, { status: 409 });
  }

  const job: NormalizedJob = {
    source: row.source,
    externalId: row.externalId,
    title: row.title,
    company: row.company,
    location: row.location,
    salary: row.salary,
    jobType: row.jobType,
    url: row.url,
    applyUrl: row.applyUrl,
    description: row.descriptionRaw, // schema column is descriptionRaw
  };

  const applier = applierFor(job);
  if (!applier) return NextResponse.json({ error: "No applier for this job's host" }, { status: 422 });

  const profile = await assembleApplicantProfile();
  // Don't submit a real application with a blank identity.
  if (!profile.email) {
    return NextResponse.json({ error: "No applicant credential found" }, { status: 422 });
  }

  const result = await applier.apply(job, profile);

  await prisma.discoveredJob.update({
    where: { id: jobId },
    data: {
      applyOutcome: result.outcome,
      // appliedAt means "actually submitted" — only stamp it on success.
      ...(result.outcome === "submitted" ? { appliedAt: new Date() } : {}),
    },
  });

  return NextResponse.json({ result });
}
