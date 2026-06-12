import { prisma } from "@/lib/db";
import { parseRequirements, type ParsedRequirement } from "@/lib/automation/indeed/parse-requirements";
import type { NormalizedJob } from "@/lib/jobs/adzuna";

type ParseFn = (descriptionHtml: string, descriptionText: string) => Promise<ParsedRequirement[]>;

/**
 * Persist normalized jobs as IndeedJob rows (model name retained to avoid a
 * migration; the source is now Adzuna). Dedups against `seenIds`, which is
 * mutated to also block duplicates within a single run. Returns created row ids.
 */
export async function ingestJobs(
  jobs: NormalizedJob[],
  searchQuery: string,
  seenIds: Set<string>,
  parseFn: ParseFn = parseRequirements,
): Promise<number[]> {
  const createdIds: number[] = [];
  for (const job of jobs) {
    if (seenIds.has(job.externalId)) continue;
    seenIds.add(job.externalId);

    let requirements: ParsedRequirement[];
    try {
      requirements = await parseFn(job.description, job.description);
    } catch {
      requirements = [];
    }

    const saved = await prisma.indeedJob.create({
      data: {
        indeedJobId: job.externalId,
        title: job.title,
        company: job.company,
        location: job.location,
        salary: job.salary,
        jobType: job.jobType,
        url: job.url,
        applyUrl: job.url,
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
  }
  return createdIds;
}
