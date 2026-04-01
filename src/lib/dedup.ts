export function isJobProcessed(linkedinJobId: string, processedIds: Set<string>): boolean {
  return processedIds.has(linkedinJobId);
}

export async function loadProcessedJobIds(): Promise<Set<string>> {
  const { prisma } = await import("@/lib/db");
  const jobs = await prisma.job.findMany({ select: { linkedinJobId: true } });
  return new Set(jobs.map((j) => j.linkedinJobId));
}
