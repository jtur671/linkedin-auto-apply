import { describe, it, expect } from "vitest";
import { z } from "zod";

const SectionScoreSchema = z.object({
  section: z.string(),
  score: z.number().min(0).max(100),
  callouts: z.array(z.string()),
  keywordGaps: z.array(z.string()),
});

const AuditResultSchema = z.object({
  overallScore: z.number().min(0).max(100),
  sections: z.array(SectionScoreSchema),
  summary: z.string(),
});

const RewriteResultSchema = z.object({
  section: z.string(),
  original: z.string(),
  rewritten: z.string(),
  keywordsAdded: z.array(z.string()),
});

describe("AuditResult schema validation", () => {
  it("validates a correct audit result", () => {
    const valid = {
      overallScore: 72,
      sections: [
        {
          section: "headline",
          score: 65,
          callouts: ["Missing keyword 'Playwright'"],
          keywordGaps: ["Playwright", "CI/CD"],
        },
        {
          section: "about",
          score: 80,
          callouts: [],
          keywordGaps: ["CI/CD"],
        },
      ],
      summary: "Profile needs keyword optimization in headline.",
    };
    expect(() => AuditResultSchema.parse(valid)).not.toThrow();
  });

  it("rejects score above 100", () => {
    const invalid = {
      overallScore: 150,
      sections: [],
      summary: "test",
    };
    expect(() => AuditResultSchema.parse(invalid)).toThrow();
  });

  it("rejects score below 0", () => {
    const invalid = {
      overallScore: -5,
      sections: [],
      summary: "test",
    };
    expect(() => AuditResultSchema.parse(invalid)).toThrow();
  });

  it("rejects missing summary", () => {
    const invalid = {
      overallScore: 50,
      sections: [],
    };
    expect(() => AuditResultSchema.parse(invalid)).toThrow();
  });
});

describe("RewriteResult schema validation", () => {
  it("validates a correct rewrite result", () => {
    const valid = {
      section: "headline",
      original: "Senior QA Engineer",
      rewritten: "Senior QA Automation Engineer | Playwright | CI/CD",
      keywordsAdded: ["Playwright", "CI/CD"],
    };
    expect(() => RewriteResultSchema.parse(valid)).not.toThrow();
  });

  it("rejects missing keywordsAdded", () => {
    const invalid = {
      section: "headline",
      original: "test",
      rewritten: "test updated",
    };
    expect(() => RewriteResultSchema.parse(invalid)).toThrow();
  });
});
