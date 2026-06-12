import { describe, it, expect } from "vitest";
import { isGreenhouseUrl, parseGreenhouseUrl } from "@/lib/sources/greenhouse-url";

describe("isGreenhouseUrl", () => {
  it("recognizes greenhouse hosts", () => {
    expect(isGreenhouseUrl("https://boards.greenhouse.io/acme/jobs/123")).toBe(true);
    expect(isGreenhouseUrl("https://job-boards.greenhouse.io/acme/jobs/123")).toBe(true);
  });
  it("rejects non-greenhouse and empty", () => {
    expect(isGreenhouseUrl("https://www.linkedin.com/jobs/view/123")).toBe(false);
    expect(isGreenhouseUrl("")).toBe(false);
    expect(isGreenhouseUrl(null)).toBe(false);
  });
});

describe("parseGreenhouseUrl", () => {
  it("extracts board token and job id", () => {
    expect(parseGreenhouseUrl("https://boards.greenhouse.io/acme/jobs/456")).toEqual({
      token: "acme",
      jobId: "456",
    });
    expect(parseGreenhouseUrl("https://job-boards.greenhouse.io/acme/jobs/789?utm=x")).toEqual({
      token: "acme",
      jobId: "789",
    });
  });
  it("returns null for malformed urls", () => {
    expect(parseGreenhouseUrl("https://boards.greenhouse.io/acme")).toBeNull();
    expect(parseGreenhouseUrl("https://www.linkedin.com/jobs/view/1")).toBeNull();
  });
});
