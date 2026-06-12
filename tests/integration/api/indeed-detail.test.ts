import { describe, it, expect } from "vitest";
import { prisma } from "@/lib/db";
import { GET } from "@/app/api/indeed/[id]/route";

const ctx = (id: number) => ({ params: Promise.resolve({ id: String(id) }) });
function seed(applyUrl: string) {
  return prisma.discoveredJob.create({
    data: {
      source: "adzuna", externalId: "1", title: "QA", company: "Acme", location: "Remote",
      url: applyUrl, applyUrl, descriptionRaw: "d", searchQuery: "qa",
    },
  });
}

describe("GET /api/indeed/[id] canAutoApply flag", () => {
  it("is true for a greenhouse job", async () => {
    const job = await seed("https://boards.greenhouse.io/acme/jobs/1");
    const res = await GET(new Request("http://x"), ctx(job.id));
    expect((await res.json()).canAutoApply).toBe(true);
  });
  it("is false for a linkedin job", async () => {
    const job = await seed("https://www.linkedin.com/jobs/view/1");
    const res = await GET(new Request("http://x"), ctx(job.id));
    expect((await res.json()).canAutoApply).toBe(false);
  });
});
