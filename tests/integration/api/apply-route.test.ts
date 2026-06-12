import { describe, it, expect, vi, afterEach } from "vitest";
import { prisma } from "@/lib/db";
import { POST } from "@/app/api/jobs/[id]/apply/route";

afterEach(() => vi.restoreAllMocks());

function seedCredential() {
  return prisma.credential.create({ data: { email: "jo@x.com", password: "e", encryptionCheck: "ok" } });
}
function seedJob(applyUrl: string, extra: { applyOutcome?: string } = {}) {
  return prisma.discoveredJob.create({
    data: {
      source: "adzuna", externalId: "1", title: "QA", company: "Acme", location: "Remote",
      url: applyUrl, applyUrl, descriptionRaw: "d", searchQuery: "qa", ...extra,
    },
  });
}
const GH = "https://boards.greenhouse.io/acme/jobs/123";
const ctx = (id: number) => ({ params: Promise.resolve({ id: String(id) }) });

function stubBoardFetch() {
  vi.stubGlobal("fetch", vi.fn(async (_u: string, init?: { method?: string }) =>
    init?.method === "POST"
      ? { ok: true, status: 200, json: async () => ({}) }
      : { ok: true, status: 200, json: async () => ({ id: 123, questions: [] }) },
  ));
}

describe("POST /api/jobs/[id]/apply", () => {
  it("routes a greenhouse job through the applier and records the outcome", async () => {
    await seedCredential();
    const job = await seedJob(GH);
    stubBoardFetch();

    const res = await POST(new Request("http://x", { method: "POST" }), ctx(job.id));
    const body = await res.json();
    expect(body.result.outcome).toBe("submitted");

    const updated = await prisma.discoveredJob.findUnique({ where: { id: job.id } });
    expect(updated?.applyOutcome).toBe("submitted");
    expect(updated?.appliedAt).not.toBeNull();
  });

  it("returns 'no applier' for a non-greenhouse job without applying", async () => {
    await seedCredential();
    const job = await seedJob("https://www.linkedin.com/jobs/view/1");
    const res = await POST(new Request("http://x", { method: "POST" }), ctx(job.id));
    const body = await res.json();
    expect(body.error).toMatch(/no applier/i);
    const updated = await prisma.discoveredJob.findUnique({ where: { id: job.id } });
    expect(updated?.applyOutcome).toBeNull();
  });

  it("returns 409 without re-applying when already submitted", async () => {
    await seedCredential();
    const job = await seedJob(GH, { applyOutcome: "submitted" });
    const res = await POST(new Request("http://x", { method: "POST" }), ctx(job.id));
    expect(res.status).toBe(409);
    expect((await res.json()).error).toMatch(/already applied/i);
  });

  it("returns 422 when there is no applicant credential", async () => {
    const job = await seedJob(GH); // no credential seeded
    const res = await POST(new Request("http://x", { method: "POST" }), ctx(job.id));
    expect(res.status).toBe(422);
    expect((await res.json()).error).toMatch(/credential/i);
    const updated = await prisma.discoveredJob.findUnique({ where: { id: job.id } });
    expect(updated?.applyOutcome).toBeNull();
  });
});
