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

describe("mapAdzunaResult", () => {
  const raw: AdzunaRawResult = {
    id: "123456789",
    title: "  Senior QA Engineer  ",
    company: { display_name: "Acme Corp" },
    location: { display_name: "Austin, TX" },
    description: "We need 5+ years of automation testing experience…",
    redirect_url: "https://www.adzuna.com/land/ad/123456789",
    salary_min: 90000,
    salary_max: 120000,
    salary_is_predicted: "0",
    contract_time: "full_time",
    contract_type: "permanent",
  };

  it("maps and trims core fields", () => {
    const job = mapAdzunaResult(raw);
    expect(job.externalId).toBe("123456789");
    expect(job.title).toBe("Senior QA Engineer");
    expect(job.company).toBe("Acme Corp");
    expect(job.location).toBe("Austin, TX");
    expect(job.url).toBe("https://www.adzuna.com/land/ad/123456789");
    expect(job.description).toBe("We need 5+ years of automation testing experience…");
    expect(job.salary).toBe("90,000–120,000");
    expect(job.jobType).toBe("full_time");
  });

  it("applies safe defaults for missing optional fields", () => {
    const job = mapAdzunaResult({ id: 42 } as unknown as AdzunaRawResult);
    expect(job.externalId).toBe("42");
    expect(job.title).toBe("Untitled");
    expect(job.company).toBe("Unknown");
    expect(job.location).toBe("");
    expect(job.salary).toBeNull();
    expect(job.jobType).toBeNull();
    expect(job.url).toBe("");
    expect(job.description).toBe("");
  });
});
