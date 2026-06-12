import { describe, it, expect, vi, afterEach } from "vitest";
import { formatSalary, mapAdzunaResult, searchAdzuna, type AdzunaRawResult } from "@/lib/jobs/adzuna";

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

describe("searchAdzuna", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  function stubEnv() {
    vi.stubEnv("ADZUNA_APP_ID", "id123");
    vi.stubEnv("ADZUNA_APP_KEY", "key456");
    vi.stubEnv("ADZUNA_COUNTRY", "us");
  }

  it("throws a clear error when credentials are missing", async () => {
    vi.stubEnv("ADZUNA_APP_ID", "");
    vi.stubEnv("ADZUNA_APP_KEY", "");
    await expect(searchAdzuna({ what: "qa" })).rejects.toThrow(/ADZUNA_APP_ID/);
  });

  it("builds the request URL and returns mapped jobs", async () => {
    stubEnv();
    const fetchMock = vi.fn(async (_url: string) => ({
      ok: true,
      json: async () => ({
        results: [
          { id: "1", title: "QA", company: { display_name: "Co" }, location: { display_name: "Remote" }, redirect_url: "u", description: "d" },
        ],
      }),
    }));
    vi.stubGlobal("fetch", fetchMock);

    const jobs = await searchAdzuna({ what: "qa engineer", where: "Austin", resultsPerPage: 50 });

    expect(jobs).toHaveLength(1);
    expect(jobs[0].title).toBe("QA");
    const calledUrl = String(fetchMock.mock.lastCall![0]);
    expect(calledUrl).toContain("/v1/api/jobs/us/search/1");
    expect(calledUrl).toContain("app_id=id123");
    expect(calledUrl).toContain("app_key=key456");
    expect(calledUrl).toContain("what=qa+engineer");
    expect(calledUrl).toContain("where=Austin");
    expect(calledUrl).toContain("results_per_page=50");
  });

  it("throws on non-ok responses", async () => {
    stubEnv();
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 429, text: async () => "rate limited" })));
    await expect(searchAdzuna({ what: "qa" })).rejects.toThrow(/429/);
  });
});
