import { describe, it, expect } from "vitest";
import { parseJobIdFromUrl, parseJobData } from "@/lib/data-parser";

describe("parseJobIdFromUrl", () => {
  it("standard URL", () => { expect(parseJobIdFromUrl("https://www.linkedin.com/jobs/view/3912345678/")).toBe("3912345678"); });
  it("URL with query", () => { expect(parseJobIdFromUrl("https://www.linkedin.com/jobs/view/3912345678/?trackingId=abc")).toBe("3912345678"); });
  it("invalid URL", () => { expect(parseJobIdFromUrl("https://www.linkedin.com/feed/")).toBeNull(); });
});
describe("parseJobData", () => {
  it("parses complete data", () => {
    expect(parseJobData({ title: "  Senior QA  ", company: "Acme  ", location: "  Remote  ", url: "https://www.linkedin.com/jobs/view/123/" }))
      .toEqual({ linkedinJobId: "123", title: "Senior QA", company: "Acme", location: "Remote", url: "https://www.linkedin.com/jobs/view/123/" });
  });
  it("null for invalid URL", () => { expect(parseJobData({ title: "T", company: "C", location: "L", url: "invalid" })).toBeNull(); });
  it("null for missing fields", () => { expect(parseJobData({ title: "", company: "C", location: "L", url: "https://www.linkedin.com/jobs/view/1/" })).toBeNull(); });
});
