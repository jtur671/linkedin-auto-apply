import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/db";

describe("Job DB Operations", () => {
  beforeEach(async () => { await prisma.job.deleteMany(); });

  it("creates a job record", async () => {
    const job = await prisma.job.create({
      data: { linkedinJobId: "t1", title: "QA", company: "Co", location: "R", url: "u", status: "applied", searchQuery: "QA" },
    });
    expect(job.id).toBeDefined();
  });

  it("enforces unique linkedinJobId", async () => {
    await prisma.job.create({ data: { linkedinJobId: "dup", title: "A", company: "A", location: "R", url: "u", status: "applied", searchQuery: "Q" } });
    await expect(prisma.job.create({ data: { linkedinJobId: "dup", title: "B", company: "B", location: "R", url: "u2", status: "applied", searchQuery: "Q" } })).rejects.toThrow();
  });

  it("upserts correctly", async () => {
    await prisma.job.create({ data: { linkedinJobId: "up1", title: "A", company: "A", location: "R", url: "u", status: "skipped", skipReason: "test", searchQuery: "Q" } });
    const updated = await prisma.job.upsert({
      where: { linkedinJobId: "up1" },
      create: { linkedinJobId: "up1", title: "A", company: "A", location: "R", url: "u", status: "applied", searchQuery: "Q" },
      update: { status: "applied", skipReason: null },
    });
    expect(updated.status).toBe("applied");
    expect(updated.skipReason).toBeNull();
  });
});
