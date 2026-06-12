import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/db";
import { ingestJobs } from "@/lib/jobs/ingest";
import type { NormalizedJob } from "@/lib/sources/types";

const job = (id: string): NormalizedJob => ({
  source: "adzuna",
  externalId: id,
  title: "QA Engineer",
  company: "Acme",
  location: "Remote",
  salary: "90,000–120,000",
  jobType: "full_time",
  url: `https://adzuna/${id}`,
  applyUrl: `https://adzuna/${id}`,
  description: "5+ years automation testing",
});

const fakeParse = async () => [
  { category: "experience", requirement: "5+ years automation testing", isRequired: true },
];

describe("ingestJobs", () => {
  beforeEach(async () => {
    await prisma.jobRequirement.deleteMany();
    await prisma.discoveredJob.deleteMany();
  });

  it("creates DiscoveredJob rows with parsed requirements", async () => {
    const ids = await ingestJobs([job("a")], "qa", new Set(), fakeParse);
    expect(ids).toHaveLength(1);
    const saved = await prisma.discoveredJob.findUnique({
      where: { source_externalId: { source: "adzuna", externalId: "a" } },
      include: { requirements: true },
    });
    expect(saved?.title).toBe("QA Engineer");
    expect(saved?.searchQuery).toBe("qa");
    expect(saved?.applyUrl).toBe("https://adzuna/a");
    expect(saved?.requirements).toHaveLength(1);
  });

  it("skips jobs whose externalId is already known", async () => {
    const ids = await ingestJobs([job("dup")], "qa", new Set(["adzuna:dup"]), fakeParse);
    expect(ids).toHaveLength(0);
    expect(await prisma.discoveredJob.count()).toBe(0);
  });

  it("adds newly-ingested ids to the seen set to dedup within a run", async () => {
    const seen = new Set<string>();
    const ids = await ingestJobs([job("x"), job("x")], "qa", seen, fakeParse);
    expect(ids).toHaveLength(1);
    expect(await prisma.discoveredJob.count()).toBe(1);
  });
});
