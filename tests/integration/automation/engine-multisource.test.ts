import { describe, it, expect } from "vitest";
import { prisma } from "@/lib/db";
import { startIndeedScrape } from "@/lib/automation/indeed/engine-indeed";
import { getIndeedState } from "@/lib/automation/indeed/state-indeed";
import type { JobSource, NormalizedJob } from "@/lib/sources/types";

const job = (source: string, id: string): NormalizedJob => ({
  source, externalId: id, title: "QA", company: "Acme", location: "Remote",
  salary: null, jobType: null, url: `https://${source}/${id}`, applyUrl: `https://${source}/${id}`,
  description: "d",
});

const fakeSource = (id: string, jobs: NormalizedJob[]): JobSource => ({
  id, label: id,
  isConfigured: () => true,
  search: async () => jobs,
});

const failingSource: JobSource = {
  id: "broken", label: "Broken",
  isConfigured: () => true,
  search: async () => {
    throw new Error("source down");
  },
};

describe("startIndeedScrape multi-source sweep", () => {
  it("ingests from every source and isolates a failing one", async () => {
    await prisma.searchConfig.create({
      data: { keywords: "qa engineer", location: "", isActive: true },
    });

    await startIndeedScrape([
      fakeSource("alpha", [job("alpha", "1"), job("alpha", "2")]),
      failingSource,
      fakeSource("beta", [job("beta", "1")]),
    ]);

    // Both healthy sources ingested despite the failure between them.
    expect(await prisma.discoveredJob.count()).toBe(3);
    expect(await prisma.discoveredJob.count({ where: { source: "alpha" } })).toBe(2);
    expect(await prisma.discoveredJob.count({ where: { source: "beta" } })).toBe(1);

    const state = getIndeedState();
    expect(state.errors).toBe(1);
    expect(state.status).toBe("idle");
  });
});
