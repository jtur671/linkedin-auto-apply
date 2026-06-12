import { describe, it, expect, vi, afterEach } from "vitest";
import { leverApplier, isLeverUrl } from "@/lib/sources/lever";
import type { ApplicantProfile, NormalizedJob } from "@/lib/sources/types";

// vitest hoists vi.mock above the imports, so this mock is in place before
// lever.ts (which imports browserApplyLever) is first evaluated.
vi.mock("@/lib/sources/lever-browser", () => ({
  browserApplyLever: vi.fn(async () => ({ outcome: "submitted", method: "browser" })),
}));
import { browserApplyLever } from "@/lib/sources/lever-browser";

const profile: ApplicantProfile = {
  email: "jo@x.com",
  resumePath: "/cv.pdf",
  answers: [
    { fieldLabel: "First name", fieldType: "text", answer: "Jo" },
    { fieldLabel: "Last name", fieldType: "text", answer: "Smith" },
  ],
};

const job = (url: string): NormalizedJob => ({
  source: "lever", externalId: "abc-123", title: "Eng", company: "Acme", location: "Remote",
  salary: null, jobType: null, url, applyUrl: url, description: "",
});

const LEVER = "https://jobs.lever.co/acme/abc-123";

afterEach(() => { vi.clearAllMocks(); });

describe("isLeverUrl", () => {
  it("accepts jobs.lever.co URLs", () => {
    expect(isLeverUrl("https://jobs.lever.co/acme/abc-123")).toBe(true);
    expect(isLeverUrl("https://jobs.lever.co/acme/abc-123/apply")).toBe(true);
  });

  it("rejects non-Lever URLs", () => {
    expect(isLeverUrl("https://linkedin.com/jobs/1")).toBe(false);
    expect(isLeverUrl("https://boards.greenhouse.io/acme/jobs/1")).toBe(false);
  });

  it("rejects http:// (insecure)", () => {
    expect(isLeverUrl("http://jobs.lever.co/acme/abc-123")).toBe(false);
  });

  it("rejects lookalike bypass host", () => {
    expect(isLeverUrl("https://jobs.lever.co.evil.com/x")).toBe(false);
  });
});

describe("leverApplier", () => {
  it("canApply is true for jobs.lever.co URLs", () => {
    expect(leverApplier.canApply(job(LEVER))).toBe(true);
    expect(leverApplier.canApply(job("https://jobs.lever.co/acme/abc-123/apply"))).toBe(true);
  });

  it("canApply is false for non-Lever URLs", () => {
    expect(leverApplier.canApply(job("https://linkedin.com/jobs/1"))).toBe(false);
    expect(leverApplier.canApply(job("https://boards.greenhouse.io/acme/jobs/1"))).toBe(false);
    expect(leverApplier.canApply(job("https://jobs.lever.co.evil.com/x"))).toBe(false);
    expect(leverApplier.canApply(job("http://jobs.lever.co/acme/abc-123"))).toBe(false);
  });

  it("apply() delegates to browserApplyLever and returns its result", async () => {
    const r = await leverApplier.apply(job(LEVER), profile);
    expect(browserApplyLever).toHaveBeenCalledOnce();
    expect(browserApplyLever).toHaveBeenCalledWith(job(LEVER), profile);
    expect(r).toEqual({ outcome: "submitted", method: "browser" });
  });

  it("apply() returns failed when browserApplyLever returns failed", async () => {
    vi.mocked(browserApplyLever).mockResolvedValueOnce({ outcome: "failed", method: "browser", message: "nav error" });
    const r = await leverApplier.apply(job(LEVER), profile);
    expect(r).toEqual({ outcome: "failed", method: "browser", message: "nav error" });
  });
});
