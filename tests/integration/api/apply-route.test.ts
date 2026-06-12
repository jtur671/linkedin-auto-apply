import { describe, it, expect, vi, afterEach } from "vitest";
import { prisma } from "@/lib/db";
import { POST } from "@/app/api/jobs/[id]/apply/route";

afterEach(() => vi.restoreAllMocks());

async function seedJob(applyUrl: string) {
  await prisma.credential.create({ data: { email: "jo@x.com", password: "e", encryptionCheck: "ok" } });
  return prisma.discoveredJob.create({
    data: {
      source: "adzuna", externalId: "1", title: "QA", company: "Acme", location: "Remote",
      url: applyUrl, applyUrl, descriptionRaw: "d", searchQuery: "qa",
    },
  });
}
const ctx = (id: number) => ({ params: Promise.resolve({ id: String(id) }) });

describe("POST /api/jobs/[id]/apply", () => {
  it("routes a greenhouse job through the applier and records the outcome", async () => {
    const job = await seedJob("https://boards.greenhouse.io/acme/jobs/123");
    vi.stubGlobal("fetch", vi.fn(async (_u: string, init?: { method?: string }) =>
      init?.method === "POST"
        ? { ok: true, status: 200, json: async () => ({}) }
        : { ok: true, status: 200, json: async () => ({ id: 123, questions: [] }) },
    ));

    const res = await POST(new Request("http://x", { method: "POST" }), ctx(job.id));
    const body = await res.json();
    expect(body.result.outcome).toBe("submitted");

    const updated = await prisma.discoveredJob.findUnique({ where: { id: job.id } });
    expect(updated?.applyOutcome).toBe("submitted");
    expect(updated?.appliedAt).not.toBeNull();
  });

  it("returns 'no applier' for a non-greenhouse job without applying", async () => {
    const job = await seedJob("https://www.linkedin.com/jobs/view/1");
    const res = await POST(new Request("http://x", { method: "POST" }), ctx(job.id));
    const body = await res.json();
    expect(body.error).toMatch(/no applier/i);
    const updated = await prisma.discoveredJob.findUnique({ where: { id: job.id } });
    expect(updated?.applyOutcome).toBeNull();
  });
});
