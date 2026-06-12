// src/app/api/queue/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { applierFor } from "@/lib/sources/registry";

const QUEUE_SIZE = 10;

export async function GET() {
  const rows = await prisma.discoveredJob.findMany({
    where: { applyOutcome: null, dismissedAt: null },
    orderBy: [{ matchScore: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
    take: QUEUE_SIZE,
  });
  const jobs = rows.map((row) => ({
    ...row,
    canAutoApply:
      applierFor({
        source: row.source, externalId: row.externalId, title: row.title, company: row.company,
        location: row.location, salary: row.salary, jobType: row.jobType, url: row.url,
        applyUrl: row.applyUrl, description: row.descriptionRaw,
      }) !== null,
  }));
  return NextResponse.json({ jobs });
}
