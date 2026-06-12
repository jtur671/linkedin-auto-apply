import { describe, it, expect, vi, afterEach } from "vitest";
import { remoteOkSource } from "@/lib/sources/remoteok-source";

afterEach(() => {
  vi.unstubAllGlobals();
});

// --- fixture helpers ---

const METADATA_ELEMENT = {
  last_updated: 1781262100,
  legal: "API Terms of Service: Please link back...",
};

const JOB_QA_ENGINEER = {
  slug: "remote-qa-engineer-acme-1001",
  id: "1001",
  epoch: 1781000000,
  date: "2026-06-10T00:00:00+00:00",
  company: "Acme Corp",
  company_logo: "",
  position: "QA Engineer",
  tags: ["qa", "testing", "automation"],
  description: "We are looking for a QA engineer to join our team.",
  location: "Worldwide",
  apply_url: "https://remoteok.com/l/1001",
  salary_min: 80000,
  salary_max: 120000,
  logo: "",
  url: "https://remoteok.com/remote-jobs/1001",
};

const JOB_BACKEND_DEV = {
  slug: "remote-backend-developer-beta-1002",
  id: "1002",
  epoch: 1781000001,
  date: "2026-06-10T00:01:00+00:00",
  company: "Beta Inc",
  company_logo: "",
  position: "Backend Developer",
  tags: ["python", "django", "api"],
  description: "Backend dev role using Python and Django.",
  location: "",
  apply_url: "https://remoteok.com/l/1002",
  salary_min: 0,
  salary_max: 0,
  logo: "",
  url: "https://remoteok.com/remote-jobs/1002",
};

const JOB_FRONTEND_DEV = {
  slug: "remote-frontend-developer-gamma-1003",
  id: "1003",
  epoch: 1781000002,
  date: "2026-06-10T00:02:00+00:00",
  company: "Gamma Ltd",
  company_logo: "",
  position: "Frontend Developer",
  tags: ["react", "typescript"],
  description: "Frontend developer needed for React projects.",
  location: "Remote",
  apply_url: "",
  salary_min: 60000,
  salary_max: 0,
  logo: "",
  url: "https://remoteok.com/remote-jobs/1003",
};

function makeFetch(jobs: unknown[]) {
  return vi.fn(async () => ({
    ok: true,
    json: async () => [METADATA_ELEMENT, ...jobs],
  }));
}

// --- tests ---

describe("remoteOkSource", () => {
  it("has id 'remoteok', a label, and isConfigured() always returns true", () => {
    expect(remoteOkSource.id).toBe("remoteok");
    expect(typeof remoteOkSource.label).toBe("string");
    expect(remoteOkSource.label.length).toBeGreaterThan(0);
    expect(remoteOkSource.isConfigured()).toBe(true);
  });

  it("skips the metadata first element and filters by all query terms", async () => {
    vi.stubGlobal(
      "fetch",
      makeFetch([JOB_QA_ENGINEER, JOB_BACKEND_DEV, JOB_FRONTEND_DEV]),
    );

    const jobs = await remoteOkSource.search({ query: "qa engineer" });

    // Only JOB_QA_ENGINEER should match ("qa" and "engineer" both appear)
    expect(jobs).toHaveLength(1);
    const job = jobs[0];
    expect(job.source).toBe("remoteok");
    expect(job.externalId).toBe("1001");
    expect(job.title).toBe("QA Engineer");
    expect(job.company).toBe("Acme Corp");
    expect(job.location).toBe("Worldwide");
    expect(job.salary).toBe("80,000–120,000");
    expect(job.jobType).toBeNull();
    expect(job.url).toBe("https://remoteok.com/remote-jobs/1001");
    expect(job.applyUrl).toBe("https://remoteok.com/l/1001");
    expect(job.description).toContain("QA engineer");
  });

  it("respects the limit parameter", async () => {
    vi.stubGlobal(
      "fetch",
      makeFetch([JOB_QA_ENGINEER, JOB_BACKEND_DEV, JOB_FRONTEND_DEV]),
    );

    const jobs = await remoteOkSource.search({ query: "developer", limit: 1 });

    // "developer" appears in both BACKEND and FRONTEND; limit caps at 1
    expect(jobs).toHaveLength(1);
  });

  it("formats salary from min/max and returns null when both are absent or zero", async () => {
    vi.stubGlobal(
      "fetch",
      makeFetch([JOB_QA_ENGINEER, JOB_BACKEND_DEV, JOB_FRONTEND_DEV]),
    );

    const all = await remoteOkSource.search({ query: "developer" });

    // Backend: salary_min=0, salary_max=0 → null
    const backend = all.find((j) => j.externalId === "1002");
    expect(backend?.salary).toBeNull();

    // Frontend: salary_min=60000, salary_max=0 → only min present
    const frontend = all.find((j) => j.externalId === "1003");
    expect(frontend?.salary).toBe("60,000");
  });

  it("falls back to url when apply_url is empty, and uses url for both url and applyUrl", async () => {
    vi.stubGlobal("fetch", makeFetch([JOB_FRONTEND_DEV]));

    // Frontend has apply_url="" → should fall back to url
    const all = await remoteOkSource.search({ query: "frontend" });
    expect(all).toHaveLength(1);
    expect(all[0].applyUrl).toBe("https://remoteok.com/remote-jobs/1003");
  });

  it("uses 'Remote' as default location when location field is empty", async () => {
    vi.stubGlobal("fetch", makeFetch([JOB_BACKEND_DEV]));

    const all = await remoteOkSource.search({ query: "backend" });
    expect(all).toHaveLength(1);
    expect(all[0].location).toBe("Remote");
  });

  it("throws a clear Error on non-ok HTTP response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 429,
        text: async () => "Rate limited",
      })),
    );

    await expect(remoteOkSource.search({ query: "qa" })).rejects.toThrow(
      /429/,
    );
  });
});
