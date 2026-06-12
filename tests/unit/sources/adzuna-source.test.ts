import { describe, it, expect, vi, afterEach } from "vitest";
import { adzunaSource } from "@/lib/sources/adzuna-source";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("adzunaSource", () => {
  it("is a JobSource with id 'adzuna'", () => {
    expect(adzunaSource.id).toBe("adzuna");
    expect(typeof adzunaSource.search).toBe("function");
  });

  it("translates criteria and returns canonical jobs", async () => {
    vi.stubEnv("ADZUNA_APP_ID", "id123");
    vi.stubEnv("ADZUNA_APP_KEY", "key456");
    vi.stubEnv("ADZUNA_COUNTRY", "us");
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        results: [{ id: "1", title: "QA", redirect_url: "https://a/1", description: "d" }],
      }),
    }));
    vi.stubGlobal("fetch", fetchMock);

    const jobs = await adzunaSource.search({ query: "qa", location: "Austin", limit: 25 });

    expect(jobs).toHaveLength(1);
    expect(jobs[0].source).toBe("adzuna");
    expect(jobs[0].applyUrl).toBe("https://a/1");
    const calledUrl = String(fetchMock.mock.lastCall![0]);
    expect(calledUrl).toContain("what=qa");
    expect(calledUrl).toContain("where=Austin");
    expect(calledUrl).toContain("results_per_page=25");
  });
});
