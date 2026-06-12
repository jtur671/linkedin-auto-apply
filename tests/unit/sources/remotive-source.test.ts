import { describe, it, expect, vi, afterEach } from "vitest";
import { remotiveSource } from "@/lib/sources/remotive-source";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("remotiveSource", () => {
  it("has id 'remotive', a label, and isConfigured() === true", () => {
    expect(remotiveSource.id).toBe("remotive");
    expect(typeof remotiveSource.label).toBe("string");
    expect(remotiveSource.label.length).toBeGreaterThan(0);
    expect(remotiveSource.isConfigured()).toBe(true);
  });

  it("builds the correct request URL and maps a realistic fixture", async () => {
    const fixtureJob = {
      id: 1956455,
      url: "https://remotive.com/remote-jobs/software-development/ios-developer-1956455",
      title: "iOS Developer",
      company_name: "nooro",
      company_logo: "https://remotive.com/job/1956455/logo",
      category: "Software Development",
      tags: ["ios", "swift"],
      job_type: "full_time",
      publication_date: "2026-06-09T21:15:39",
      candidate_required_location: "USA",
      salary: "$60k-$130k (depending on experience)",
      description: "<p>Build iOS apps for healthcare.</p>",
    };

    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ jobs: [fixtureJob] }),
    }));
    vi.stubGlobal("fetch", fetchMock);

    const jobs = await remotiveSource.search({ query: "ios developer", limit: 10 });

    // URL shape
    const calledUrl = String((fetchMock.mock.lastCall as unknown[])[0]);
    expect(calledUrl).toContain("remotive.com/api/remote-jobs");
    // URLSearchParams encodes spaces as '+'; both '+' and '%20' are valid
    expect(calledUrl).toMatch(/search=ios[+%20]developer/);
    expect(calledUrl).toContain("limit=10");

    // Mapping — every NormalizedJob field
    expect(jobs).toHaveLength(1);
    const job = jobs[0];
    expect(job.source).toBe("remotive");
    expect(job.externalId).toBe("1956455");
    expect(job.title).toBe("iOS Developer");
    expect(job.company).toBe("nooro");
    expect(job.location).toBe("USA");
    expect(job.salary).toBe("$60k-$130k (depending on experience)");
    expect(job.jobType).toBe("full_time");
    expect(job.url).toBe(
      "https://remotive.com/remote-jobs/software-development/ios-developer-1956455"
    );
    expect(job.applyUrl).toBe(
      "https://remotive.com/remote-jobs/software-development/ios-developer-1956455"
    );
    expect(job.description).toBe("<p>Build iOS apps for healthcare.</p>");
  });

  it("applies safe defaults for a sparse job object", async () => {
    const sparseJob = {
      id: 9999,
      url: "https://remotive.com/remote-jobs/other/sparse-9999",
      // title, company_name, candidate_required_location, salary, job_type all missing
      description: "<p>minimal</p>",
    };

    vi.stubGlobal("fetch", async () => ({
      ok: true,
      json: async () => ({ jobs: [sparseJob] }),
    }));

    const jobs = await remotiveSource.search({ query: "anything" });

    expect(jobs).toHaveLength(1);
    const job = jobs[0];
    expect(job.source).toBe("remotive");
    expect(job.externalId).toBe("9999");
    expect(job.title).toBe("Untitled");
    expect(job.company).toBe("Unknown");
    expect(job.location).toBe("");
    expect(job.salary).toBeNull();
    expect(job.jobType).toBeNull();
    expect(job.url).toBe("https://remotive.com/remote-jobs/other/sparse-9999");
    expect(job.applyUrl).toBe("https://remotive.com/remote-jobs/other/sparse-9999");
  });

  it("throws on a non-ok HTTP response", async () => {
    vi.stubGlobal("fetch", async () => ({
      ok: false,
      status: 429,
    }));

    await expect(
      remotiveSource.search({ query: "qa engineer" })
    ).rejects.toThrow("Remotive API error: 429");
  });
});
