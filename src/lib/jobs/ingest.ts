import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { parseRequirements, type ParsedRequirement } from "@/lib/automation/indeed/parse-requirements";
import type { NormalizedJob } from "@/lib/sources/types";

type ParseFn = (descriptionHtml: string, descriptionText: string) => Promise<ParsedRequirement[]>;

export async function ingestJobs(
  jobs: NormalizedJob[],
  searchQuery: string,
  seenIds: Set<string>,
  parseFn: ParseFn = parseRequirements,
): Promise<number[]> {
  const createdIds: number[] = [];
  for (const job of jobs) {
    const key = `${job.source}:${job.externalId}`;
    if (seenIds.has(key)) continue;
    seenIds.add(key);

    let requirements: ParsedRequirement[];
    try {
      requirements = await parseFn(job.description, job.description);
    } catch {
      requirements = [];
    }

    try {
      const saved = await prisma.discoveredJob.create({
        data: {
          source: job.source,
          externalId: job.externalId,
          title: job.title,
          company: job.company,
          location: job.location,
          salary: job.salary,
          jobType: job.jobType,
          url: job.url,
          applyUrl: job.applyUrl ?? job.url,
          descriptionRaw: job.description,
          searchQuery,
          requirements: {
            create: requirements.map((r) => ({
              category: r.category,
              requirement: r.requirement,
              isRequired: r.isRequired,
            })),
          },
        },
      });
      createdIds.push(saved.id);
    } catch (e) {
      // Already stored under the (source, externalId) unique key — a re-discovered
      // job from a later search/run. Skip rather than failing the batch.
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") continue;
      throw e;
    }
  }
  return createdIds;
}
