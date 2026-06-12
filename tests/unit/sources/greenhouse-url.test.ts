import { describe, it, expect } from "vitest";
import { isGreenhouseUrl, parseGreenhouseUrl } from "@/lib/sources/greenhouse-url";

describe("isGreenhouseUrl", () => {
  it("recognizes greenhouse hosts", () => {
    expect(isGreenhouseUrl("https://boards.greenhouse.io/acme/jobs/123")).toBe(true);
    expect(isGreenhouseUrl("https://job-boards.greenhouse.io/acme/jobs/123")).toBe(true);
  });
  it("recognizes the apex domain", () => {
    expect(isGreenhouseUrl("https://greenhouse.io/acme/jobs/123")).toBe(true);
  });
  it("rejects non-greenhouse and empty", () => {
    expect(isGreenhouseUrl("https://www.linkedin.com/jobs/view/123")).toBe(false);
    expect(isGreenhouseUrl("")).toBe(false);
    expect(isGreenhouseUrl(null)).toBe(false);
  });
  it("rejects look-alike hosts that merely contain the domain", () => {
    expect(isGreenhouseUrl("https://greenhouse.io.evil.com/acme/jobs/1")).toBe(false);
    expect(isGreenhouseUrl("https://notgreenhouse.io/acme/jobs/1")).toBe(false);
  });
  it("requires https", () => {
    expect(isGreenhouseUrl("http://boards.greenhouse.io/acme/jobs/1")).toBe(false);
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
