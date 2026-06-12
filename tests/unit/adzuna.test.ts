import { describe, it, expect } from "vitest";
import { vi, afterEach } from "vitest";
import { formatSalary } from "@/lib/jobs/adzuna";
import { mapAdzunaResult, type AdzunaRawResult } from "@/lib/jobs/adzuna";
import { searchAdzuna } from "@/lib/jobs/adzuna";

describe("formatSalary", () => {
  it("formats a min–max range with thousands separators", () => {
    expect(formatSalary(50000, 70000, false)).toBe("50,000–70,000");
  });
  it("marks predicted salaries as estimated", () => {
    expect(formatSalary(50000, 70000, true)).toBe("50,000–70,000 (estimated)");
  });
  it("handles a single bound", () => {
    expect(formatSalary(80000, undefined, false)).toBe("80,000");
  });
  it("returns null when no salary is present", () => {
    expect(formatSalary(undefined, undefined, false)).toBeNull();
  });
});
