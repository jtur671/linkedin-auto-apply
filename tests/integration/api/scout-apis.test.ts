// tests/integration/api/scout-apis.test.ts
import { describe, it, expect } from "vitest";
import { prisma } from "@/lib/db";
import { GET as getSources } from "@/app/api/sources/route";
import { GET as getQueue } from "@/app/api/queue/route";
import { POST as dismiss, DELETE as restore } from "@/app/api/jobs/[id]/dismiss/route";

const ctx = (id: number) => ({ params: Promise.resolve({ id: String(id) }) });
const seed = (over: Record<string, unknown> = {}) =>
  prisma.discoveredJob.create({
    data: {
      source: "remotive", externalId: String(Math.random()), title: "QA", company: "Acme",
      location: "Remote", url: "https://x/1", applyUrl: "https://boards.greenhouse.io/a/jobs/1",
      descriptionRaw: "d", searchQuery: "qa", ...over,
    },
  });

describe("GET /api/sources", () => {
  it("lists registered sources with configured flags", async () => {
    const res = await getSources();
    const body = await res.json();
    expect(body.sources.length).toBeGreaterThanOrEqual(6);
    const ids = body.sources.map((s: { id: string }) => s.id);
    expect(ids).toEqual(expect.arrayContaining(["adzuna", "remotive", "hiringcafe"]));
    expect(typeof body.sources[0].configured).toBe("boolean");
  });
});

describe("GET /api/queue", () => {
  it("returns unapplied, undismissed jobs ordered by match score, with canAutoApply", async () => {
    await seed({ matchScore: 95 });
    await seed({ matchScore: 50, applyUrl: "https://example.com/x" });
    await seed({ matchScore: 99, applyOutcome: "submitted" }); // applied — excluded
    await seed({ matchScore: 98, dismissedAt: new Date() });   // passed — excluded
    const res = await getQueue();
    const body = await res.json();
    expect(body.jobs).toHaveLength(2);
    expect(body.jobs[0].matchScore).toBe(95);
    expect(body.jobs[0].canAutoApply).toBe(true);   // greenhouse applyUrl
    expect(body.jobs[1].canAutoApply).toBe(false);  // example.com
  });
});

describe("POST /api/jobs/[id]/dismiss", () => {
  it("stamps dismissedAt", async () => {
    const job = await seed({});
    const res = await dismiss(new Request("http://x", { method: "POST" }), ctx(job.id));
    expect(res.status).toBe(200);
    const updated = await prisma.discoveredJob.findUnique({ where: { id: job.id } });
    expect(updated?.dismissedAt).not.toBeNull();
  });

  it("returns 400 for invalid id", async () => {
    const res = await dismiss(
      new Request("http://x", { method: "POST" }),
      { params: Promise.resolve({ id: "abc" }) },
    );
    expect(res.status).toBe(400);
  });

  it("returns 404 for non-existent job", async () => {
    const res = await dismiss(
      new Request("http://x", { method: "POST" }),
      ctx(999999),
    );
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/jobs/[id]/dismiss (restore)", () => {
  it("clears dismissedAt to restore a passed job", async () => {
    const job = await seed({ dismissedAt: new Date() });
    const res = await restore(new Request("http://x", { method: "DELETE" }), ctx(job.id));
    expect(res.status).toBe(200);
    const updated = await prisma.discoveredJob.findUnique({ where: { id: job.id } });
    expect(updated?.dismissedAt).toBeNull();
  });

  it("returns 400 for invalid id", async () => {
    const res = await restore(
      new Request("http://x", { method: "DELETE" }),
      { params: Promise.resolve({ id: "notanumber" }) },
    );
    expect(res.status).toBe(400);
  });

  it("returns 404 for non-existent job", async () => {
    const res = await restore(
      new Request("http://x", { method: "DELETE" }),
      ctx(999999),
    );
    expect(res.status).toBe(404);
  });
});
