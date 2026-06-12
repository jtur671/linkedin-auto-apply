import { describe, it, expect } from "vitest";
import { prisma } from "@/lib/db";
import { ingestJobs } from "@/lib/jobs/ingest";
import type { NormalizedJob } from "@/lib/sources/types";

const fakeParse = async () => [];
const job = (source: string, id: string): NormalizedJob => ({
  source, externalId: id, title: "QA", company: "Acme", location: "Remote",
  salary: null, jobType: null, url: `https://${source}/${id}`, applyUrl: `https://${source}/${id}`,
  description: "d",
});

describe("cross-source dedup", () => {
  it("keeps same externalId from different sources", async () => {
    await ingestJobs([job("adzuna", "1"), job("greenhouse", "1")], "qa", new Set(), fakeParse);
    expect(await prisma.discoveredJob.count()).toBe(2);
  });

  it("dedupes same (source, externalId) across separate runs", async () => {
    await ingestJobs([job("adzuna", "1")], "qa", new Set(), fakeParse);
    const ids = await ingestJobs([job("adzuna", "1")], "qa", new Set(), fakeParse);
    expect(ids).toHaveLength(0);
    expect(await prisma.discoveredJob.count()).toBe(1);
  });
});
