import { describe, it, expect } from "vitest";
import { ashbyApplier } from "@/lib/sources/ashby";
import type { ApplicantProfile, NormalizedJob } from "@/lib/sources/types";

const profile: ApplicantProfile = {
  email: "jo@x.com",
  resumePath: "/cv.pdf",
  answers: [{ fieldLabel: "First name", fieldType: "text", answer: "Jo" }],
};

function job(url: string, applyUrl: string | null = url): NormalizedJob {
  return {
    source: "adzuna",
    externalId: "abc123",
    title: "Engineer",
    company: "Acme",
    location: "Remote",
    salary: null,
    jobType: null,
    url,
    applyUrl,
    description: "",
  };
}

describe("ashbyApplier", () => {
  describe("id", () => {
    it('has id "ashby"', () => {
      expect(ashbyApplier.id).toBe("ashby");
    });
  });

  describe("canApply", () => {
    it("returns true for a canonical jobs.ashbyhq.com URL", () => {
      expect(
        ashbyApplier.canApply(job("https://jobs.ashbyhq.com/acme/uuid-here")),
      ).toBe(true);
    });

    it("returns true when applyUrl is ashbyhq and job url is not", () => {
      expect(
        ashbyApplier.canApply(
          job(
            "https://example.com/careers",
            "https://jobs.ashbyhq.com/acme/some-uuid",
          ),
        ),
      ).toBe(true);
    });

    it("returns true for a subdomain of ashbyhq.com", () => {
      // Some boards use a custom subdomain like acme.ashbyhq.com
      expect(
        ashbyApplier.canApply(job("https://acme.ashbyhq.com/jobs/123")),
      ).toBe(true);
    });

    it("returns false for a greenhouse URL", () => {
      expect(
        ashbyApplier.canApply(
          job("https://boards.greenhouse.io/acme/jobs/123"),
        ),
      ).toBe(false);
    });

    it("returns false for a lever URL", () => {
      expect(
        ashbyApplier.canApply(job("https://jobs.lever.co/acme/uuid")),
      ).toBe(false);
    });

    it("returns false for a linkedin URL", () => {
      expect(
        ashbyApplier.canApply(
          job("https://www.linkedin.com/jobs/view/123456789"),
        ),
      ).toBe(false);
    });

    it("returns false for a host-bypass attempt (ashbyhq.com.evil.com)", () => {
      expect(
        ashbyApplier.canApply(
          job("https://jobs.ashbyhq.com.evil.com/x"),
        ),
      ).toBe(false);
    });

    it("returns false for http (non-https) ashbyhq URL", () => {
      expect(
        ashbyApplier.canApply(job("http://jobs.ashbyhq.com/x")),
      ).toBe(false);
    });

    it("returns false when applyUrl is null and url is not ashbyhq", () => {
      expect(
        ashbyApplier.canApply(job("https://example.com/job/1", null)),
      ).toBe(false);
    });

    it("returns false for an empty string url", () => {
      // URL constructor will throw; canApply must not throw
      const j = job("https://example.com/job/1", "");
      // applyUrl is "" (falsy-ish but not null); override to test empty string path
      expect(ashbyApplier.canApply({ ...j, url: "", applyUrl: "" })).toBe(
        false,
      );
    });

    it("does not throw for null applyUrl and null-like url", () => {
      // Defensive: even an obviously non-ashby job must not throw
      expect(() =>
        ashbyApplier.canApply(job("https://example.com", null)),
      ).not.toThrow();
    });
  });

  describe("apply", () => {
    it("resolves with outcome needs_review", async () => {
      const result = await ashbyApplier.apply(
        job("https://jobs.ashbyhq.com/acme/uuid-here"),
        profile,
      );
      expect(result.outcome).toBe("needs_review");
    });

    it("resolves with method api", async () => {
      const result = await ashbyApplier.apply(
        job("https://jobs.ashbyhq.com/acme/uuid-here"),
        profile,
      );
      expect(result.method).toBe("api");
    });

    it("includes a non-empty message", async () => {
      const result = await ashbyApplier.apply(
        job("https://jobs.ashbyhq.com/acme/uuid-here"),
        profile,
      );
      expect(result.message).toBeTruthy();
    });

    it("never throws, even on a non-ashby job", async () => {
      await expect(
        ashbyApplier.apply(job("https://example.com/job/1"), profile),
      ).resolves.toBeDefined();
    });

    it("never throws, even with a minimal empty profile", async () => {
      const emptyProfile: ApplicantProfile = {
        email: "",
        resumePath: null,
        answers: [],
      };
      await expect(
        ashbyApplier.apply(
          job("https://jobs.ashbyhq.com/acme/uuid-here"),
          emptyProfile,
        ),
      ).resolves.toMatchObject({ outcome: "needs_review" });
    });
  });
});
