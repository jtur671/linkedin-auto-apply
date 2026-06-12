import { describe, it, expect, vi, afterEach } from "vitest";
import { usajobsSource } from "@/lib/sources/usajobs-source";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

// ---------------------------------------------------------------------------
// Fixture representing a minimal but complete USAJOBS API response
// ---------------------------------------------------------------------------
const FIXTURE_ITEM = {
  MatchedObjectId: "812345600",
  MatchedObjectDescriptor: {
    PositionID: "ABC-12-345",
    PositionTitle: "QA Engineer",
    OrganizationName: "Department of the Air Force",
    PositionLocationDisplay: "Austin, Texas",
    PositionURI: "https://www.usajobs.gov:443/GetJob/ViewDetails/812345600",
    ApplyURI: [
      "https://www.usajobs.gov:443/GetJob/ViewDetails/812345600?PostingChannelID=",
    ],
    PositionRemuneration: [
      { MinimumRange: "88000.0", MaximumRange: "115000.0", RateIntervalCode: "PA" },
    ],
    UserArea: { Details: { JobSummary: "As a QA Engineer you will..." } },
  },
};

const FIXTURE_RESPONSE = {
  SearchResult: {
    SearchResultItems: [FIXTURE_ITEM],
  },
};

function makeFetch(responseBody: unknown, ok = true) {
  return vi.fn(async () => ({
    ok,
    status: ok ? 200 : 500,
    text: async () => "Internal Server Error",
    json: async () => responseBody,
  }));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("usajobsSource — identity", () => {
  it("has id 'usajobs' and a non-empty label", () => {
    expect(usajobsSource.id).toBe("usajobs");
    expect(usajobsSource.label).toBeTruthy();
    expect(typeof usajobsSource.search).toBe("function");
  });
});

describe("usajobsSource — isConfigured()", () => {
  it("returns true when both env vars are set", () => {
    vi.stubEnv("USAJOBS_API_KEY", "mykey");
    vi.stubEnv("USAJOBS_USER_AGENT", "test@example.com");
    expect(usajobsSource.isConfigured()).toBe(true);
  });

  it("returns false when USAJOBS_API_KEY is missing", () => {
    vi.stubEnv("USAJOBS_API_KEY", "");
    vi.stubEnv("USAJOBS_USER_AGENT", "test@example.com");
    expect(usajobsSource.isConfigured()).toBe(false);
  });

  it("returns false when USAJOBS_USER_AGENT is missing", () => {
    vi.stubEnv("USAJOBS_API_KEY", "mykey");
    vi.stubEnv("USAJOBS_USER_AGENT", "");
    expect(usajobsSource.isConfigured()).toBe(false);
  });

  it("returns false when both env vars are missing", () => {
    vi.stubEnv("USAJOBS_API_KEY", "");
    vi.stubEnv("USAJOBS_USER_AGENT", "");
    expect(usajobsSource.isConfigured()).toBe(false);
  });
});

describe("usajobsSource — search() credentials guard", () => {
  it("throws a clear error when not configured", async () => {
    vi.stubEnv("USAJOBS_API_KEY", "");
    vi.stubEnv("USAJOBS_USER_AGENT", "");
    await expect(usajobsSource.search({ query: "engineer" })).rejects.toThrow(
      /USAJOBS_API_KEY.*USAJOBS_USER_AGENT|credentials/i,
    );
  });
});

describe("usajobsSource — search() happy path", () => {
  it("builds the correct URL with required headers and maps the fixture", async () => {
    vi.stubEnv("USAJOBS_API_KEY", "mykey");
    vi.stubEnv("USAJOBS_USER_AGENT", "test@example.com");

    const fetchMock = makeFetch(FIXTURE_RESPONSE);
    vi.stubGlobal("fetch", fetchMock);

    const jobs = await usajobsSource.search({
      query: "QA Engineer",
      location: "Austin",
      limit: 10,
    });

    // --- URL ---
    expect(fetchMock).toHaveBeenCalledOnce();
    const [calledUrl, calledInit] = (fetchMock.mock.lastCall as unknown) as [string, RequestInit];
    expect(calledUrl).toContain("data.usajobs.gov/api/search");
    expect(calledUrl).toContain("Keyword=QA+Engineer");
    expect(calledUrl).toContain("ResultsPerPage=10");
    expect(calledUrl).toContain("LocationName=Austin");

    // --- Required headers ---
    const headers = calledInit.headers as Record<string, string>;
    expect(headers["Authorization-Key"]).toBe("mykey");
    expect(headers["User-Agent"]).toBe("test@example.com");
    expect(headers["Host"]).toBe("data.usajobs.gov");

    // --- Mapped job ---
    expect(jobs).toHaveLength(1);
    const job = jobs[0];
    expect(job.source).toBe("usajobs");
    expect(job.externalId).toBe("812345600");
    expect(job.title).toBe("QA Engineer");
    expect(job.company).toBe("Department of the Air Force");
    expect(job.location).toBe("Austin, Texas");
    expect(job.salary).toBe("88,000–115,000"); // formatSalary output
    expect(job.jobType).toBeNull();
    expect(job.url).toBe("https://www.usajobs.gov:443/GetJob/ViewDetails/812345600");
    expect(job.applyUrl).toBe(
      "https://www.usajobs.gov:443/GetJob/ViewDetails/812345600?PostingChannelID=",
    );
    expect(job.description).toBe("As a QA Engineer you will...");
  });

  it("omits LocationName param when no location provided", async () => {
    vi.stubEnv("USAJOBS_API_KEY", "mykey");
    vi.stubEnv("USAJOBS_USER_AGENT", "test@example.com");

    const fetchMock = makeFetch(FIXTURE_RESPONSE);
    vi.stubGlobal("fetch", fetchMock);

    await usajobsSource.search({ query: "engineer" });

    const [calledUrl] = (fetchMock.mock.lastCall as unknown) as [string, RequestInit];
    expect(calledUrl).not.toContain("LocationName");
  });

  it("uses default limit of 50 when none specified", async () => {
    vi.stubEnv("USAJOBS_API_KEY", "mykey");
    vi.stubEnv("USAJOBS_USER_AGENT", "test@example.com");

    const fetchMock = makeFetch(FIXTURE_RESPONSE);
    vi.stubGlobal("fetch", fetchMock);

    await usajobsSource.search({ query: "engineer" });

    const [calledUrl] = (fetchMock.mock.lastCall as unknown) as [string, RequestInit];
    expect(calledUrl).toContain("ResultsPerPage=50");
  });
});

describe("usajobsSource — safe defaults for sparse items", () => {
  it("handles missing optional fields gracefully", async () => {
    vi.stubEnv("USAJOBS_API_KEY", "mykey");
    vi.stubEnv("USAJOBS_USER_AGENT", "test@example.com");

    const sparseItem = {
      MatchedObjectId: "999",
      MatchedObjectDescriptor: {
        PositionID: "X-99",
        PositionTitle: "Analyst",
        OrganizationName: "GSA",
        // no PositionLocationDisplay
        PositionURI: "https://www.usajobs.gov:443/GetJob/ViewDetails/999",
        // no ApplyURI
        PositionRemuneration: [], // empty — salary should be null
        // no UserArea
      },
    };

    const fetchMock = makeFetch({
      SearchResult: { SearchResultItems: [sparseItem] },
    });
    vi.stubGlobal("fetch", fetchMock);

    const jobs = await usajobsSource.search({ query: "analyst" });
    expect(jobs).toHaveLength(1);
    const job = jobs[0];
    expect(job.externalId).toBe("999");
    expect(job.location).toBe("");
    expect(job.salary).toBeNull();
    expect(job.jobType).toBeNull();
    // applyUrl falls back to PositionURI when ApplyURI is absent
    expect(job.applyUrl).toBe("https://www.usajobs.gov:443/GetJob/ViewDetails/999");
    expect(job.description).toBe("");
  });

  it("falls back to PositionID when MatchedObjectId is absent", async () => {
    vi.stubEnv("USAJOBS_API_KEY", "mykey");
    vi.stubEnv("USAJOBS_USER_AGENT", "test@example.com");

    const itemNoMatchId = {
      // no MatchedObjectId
      MatchedObjectDescriptor: {
        PositionID: "FALLBACK-ID",
        PositionTitle: "Clerk",
        OrganizationName: "DOJ",
        PositionLocationDisplay: "DC",
        PositionURI: "https://www.usajobs.gov:443/GetJob/ViewDetails/fallback",
        ApplyURI: [],
        PositionRemuneration: [],
      },
    };

    const fetchMock = makeFetch({
      SearchResult: { SearchResultItems: [itemNoMatchId] },
    });
    vi.stubGlobal("fetch", fetchMock);

    const jobs = await usajobsSource.search({ query: "clerk" });
    expect(jobs[0].externalId).toBe("FALLBACK-ID");
  });
});

describe("usajobsSource — error handling", () => {
  it("throws on non-ok HTTP response", async () => {
    vi.stubEnv("USAJOBS_API_KEY", "mykey");
    vi.stubEnv("USAJOBS_USER_AGENT", "test@example.com");

    const fetchMock = makeFetch({}, false);
    vi.stubGlobal("fetch", fetchMock);

    await expect(usajobsSource.search({ query: "engineer" })).rejects.toThrow(
      /500/,
    );
  });
});
