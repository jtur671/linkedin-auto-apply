import { describe, it, expect, vi, afterEach } from "vitest";
import { greenhouseApplier } from "@/lib/sources/greenhouse";
import type { ApplicantProfile, NormalizedJob } from "@/lib/sources/types";

vi.mock("@/lib/sources/greenhouse-browser", () => ({
  browserApplyGreenhouse: vi.fn(async () => ({ outcome: "submitted", method: "browser" })),
}));
import { browserApplyGreenhouse } from "@/lib/sources/greenhouse-browser";

const profile: ApplicantProfile = {
  email: "jo@x.com",
  resumePath: "/cv.pdf",
  answers: [{ fieldLabel: "First name", fieldType: "text", answer: "Jo" }],
};
const job = (url: string): NormalizedJob => ({
  source: "adzuna", externalId: "1", title: "QA", company: "Acme", location: "Remote",
  salary: null, jobType: null, url, applyUrl: url, description: "",
});
const GH = "https://boards.greenhouse.io/acme/jobs/123";

function mockBoard(questions: unknown[], submitStatus: number) {
  return vi.fn(async (url: string, init?: { method?: string }) => {
    if (init?.method === "POST") return { ok: submitStatus < 400, status: submitStatus, json: async () => ({}) };
    return { ok: true, status: 200, json: async () => ({ id: 123, questions }) };
  });
}

afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });

describe("greenhouseApplier", () => {
  it("canApply matches greenhouse hosts only", () => {
    expect(greenhouseApplier.canApply(job(GH))).toBe(true);
    expect(greenhouseApplier.canApply(job("https://linkedin.com/jobs/1"))).toBe(false);
  });

  it("submits via API when all required questions resolve", async () => {
    vi.stubGlobal("fetch", mockBoard(
      [{ label: "First name", required: true, fields: [{ name: "first_name", type: "input_text" }] }], 200,
    ));
    const r = await greenhouseApplier.apply(job(GH), profile);
    expect(r).toEqual({ outcome: "submitted", method: "api" });
  });

  it("returns needs_review when a required question is unanswered", async () => {
    vi.stubGlobal("fetch", mockBoard(
      [{ label: "Why us?", required: true, fields: [{ name: "q1", type: "textarea" }] }], 200,
    ));
    const r = await greenhouseApplier.apply(job(GH), profile);
    expect(r.outcome).toBe("needs_review");
  });

  it("falls back to the browser on 401/403", async () => {
    vi.stubGlobal("fetch", mockBoard(
      [{ label: "First name", required: true, fields: [{ name: "first_name", type: "input_text" }] }], 403,
    ));
    const r = await greenhouseApplier.apply(job(GH), profile);
    expect(browserApplyGreenhouse).toHaveBeenCalledOnce();
    expect(r).toEqual({ outcome: "submitted", method: "browser" });
  });

  it("fails cleanly on an unrecognized URL", async () => {
    const r = await greenhouseApplier.apply(job("https://boards.greenhouse.io/acme"), profile);
    expect(r.outcome).toBe("failed");
  });
});
