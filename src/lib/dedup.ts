export function isJobProcessed(linkedinJobId: string, processedIds: Set<string>): boolean {
  return processedIds.has(linkedinJobId);
}

export async function loadProcessedJobIds(): Promise<Set<string>> {
  const { prisma } = await import("@/lib/db");
  // Only skip jobs that were already applied, errored, or still needs_review
  // Jobs reset to 'pending' should be retried
  const jobs = await prisma.job.findMany({
    where: { status: { not: "pending" } },
    select: { linkedinJobId: true },
  });
  return new Set(jobs.map((j) => j.linkedinJobId));
}
