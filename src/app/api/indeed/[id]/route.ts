import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { applierFor } from "@/lib/sources/registry";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const jobId = parseInt(id);

  if (isNaN(jobId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const job = await prisma.discoveredJob.findUnique({
    where: { id: jobId },
    include: {
      requirements: {
        orderBy: [{ isRequired: "desc" }, { category: "asc" }],
      },
    },
  });

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const canAutoApply =
    applierFor({
      source: job.source,
      externalId: job.externalId,
      title: job.title,
      company: job.company,
      location: job.location,
      salary: job.salary,
      jobType: job.jobType,
      url: job.url,
      applyUrl: job.applyUrl,
      description: job.descriptionRaw,
    }) !== null;

  return NextResponse.json({ job, canAutoApply });
}
