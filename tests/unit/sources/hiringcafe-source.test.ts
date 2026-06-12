import { describe, it, expect, vi, afterEach } from "vitest";
import { hiringCafeSource } from "@/lib/sources/hiringcafe-source";

afterEach(() => {
  vi.unstubAllGlobals();
});

// ── Fixture ───────────────────────────────────────────────────────────────────

const LEVER_HIT = {
  id: "lever___integrate___acd3abcd1234",
  apply_url: "https://jobs.lever.co/integrate/acd3abcd-1234-5678-abcd-ef0123456789",
  job_information: { title: "Software Engineer II" },
  v5_processed_job_data: {
    core_job_title: "Software Engineer",
    company_name: "Integrate",
    formatted_workplace_location: "Phoenix, AZ",
    yearly_min_compensation: 120000,
    yearly_max_compensation: 160000,
    commitment: ["Full Time"],
    requirements_summary: "5+ years backend experience; Python and Go preferred.",
  },
};

const GREENHOUSE_HIT = {
  id: "grnhse___acme___9999001",
  apply_url: "https://boards.greenhouse.io/acme/jobs/9999001",
  job_information: { title: "QA Lead (backup)" },
  v5_processed_job_data: {
    core_job_title: "QA Lead",
    company_name: "Acme Corp",
    formatted_workplace_location: "Remote",
    yearly_min_compensation: 90000,
    yearly_max_compensation: 130000,
    commitment: ["Contract"],
    requirements_summary: "Selenium, Cypress, JIRA.",
  },
};

function makeHtml(hits: unknown[]): string {
  const nextData = JSON.stringify({
    props: {
      pageProps: {
        ssrHits: hits,
      },
    },
  });
  return `<!DOCTYPE html><html><head></head><body>
    <script id="__NEXT_DATA__" type="application/json">${nextData}</script>
  </body></html>`;
}

function makeFetch(html: string, status = 200) {
  return vi.fn(async () => ({
    ok: status >= 200 && status < 300,
    status,
    text: async () => html,
  }));
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("hiringCafeSource", () => {
  // ── 1. identity ──────────────────────────────────────────────────────────
  it("has id 'hiringcafe', a non-empty label, and isConfigured() === true", () => {
    expect(hiringCafeSource.id).toBe("hiringcafe");
    expect(typeof hiringCafeSource.label).toBe("string");
    expect(hiringCafeSource.label.length).toBeGreaterThan(0);
    expect(hiringCafeSource.isConfigured()).toBe(true);
  });

  // ── 2. request shape + full field mapping ─────────────────────────────────
  it("builds the correct request URL and maps all NormalizedJob fields", async () => {
    vi.stubGlobal("fetch", makeFetch(makeHtml([LEVER_HIT, GREENHOUSE_HIT])));

    const jobs = await hiringCafeSource.search({ query: "software engineer", limit: 50 });

    // Inspect the URL that was called
    const [calledUrl, calledInit] = (vi.mocked(fetch).mock.lastCall as [string, RequestInit]);
    const url = new URL(calledUrl);
    expect(url.hostname).toBe("hiring.cafe");
    expect(url.pathname).toBe("/");
    expect(url.searchParams.get("page")).toBe("1");

    const searchState = JSON.parse(url.searchParams.get("searchState") as string);
    expect(searchState.searchQuery).toBe("software engineer");
    expect(searchState.sortBy).toBe("date");
    // No remote or maxDaysOld when not specified
    expect(searchState.workplaceTypes).toBeUndefined();
    expect(searchState.dateFetchedPastNDays).toBeUndefined();

    // Headers
    expect((calledInit?.headers as Record<string, string>)["User-Agent"]).toContain("Chrome");
    expect((calledInit?.headers as Record<string, string>)["Accept"]).toBe("text/html");

    // Both hits returned (under limit)
    expect(jobs).toHaveLength(2);

    // ── Lever job ────────────────────────────────────────────────────────────
    const j = jobs[0];
    expect(j.source).toBe("hiringcafe");
    expect(j.externalId).toBe("lever___integrate___acd3abcd1234");
    expect(j.title).toBe("Software Engineer"); // prefers core_job_title
    expect(j.company).toBe("Integrate");
    expect(j.location).toBe("Phoenix, AZ");
    expect(j.salary).toBe("120,000–160,000");
    expect(j.jobType).toBe("Full Time");
    // apply_url is a direct ATS link — the whole point of this source
    expect(j.url).toBe("https://jobs.lever.co/integrate/acd3abcd-1234-5678-abcd-ef0123456789");
    expect(j.applyUrl).toBe("https://jobs.lever.co/integrate/acd3abcd-1234-5678-abcd-ef0123456789");
    expect(j.description).toBe("5+ years backend experience; Python and Go preferred.");

    // ── Greenhouse job ───────────────────────────────────────────────────────
    const g = jobs[1];
    expect(g.externalId).toBe("grnhse___acme___9999001");
    expect(g.url).toBe("https://boards.greenhouse.io/acme/jobs/9999001");
    expect(g.applyUrl).toBe("https://boards.greenhouse.io/acme/jobs/9999001");
    expect(g.jobType).toBe("Contract");
  });

  // ── 2b. remote + maxDaysOld variants ────────────────────────────────────
  it("includes workplaceTypes and dateFetchedPastNDays when remote/maxDaysOld are set", async () => {
    vi.stubGlobal("fetch", makeFetch(makeHtml([LEVER_HIT])));

    await hiringCafeSource.search({ query: "devops", remote: true, maxDaysOld: 7 });

    const [calledUrl] = vi.mocked(fetch).mock.lastCall as [string, RequestInit];
    const searchState = JSON.parse(new URL(calledUrl).searchParams.get("searchState") as string);
    expect(searchState.workplaceTypes).toEqual(["Remote"]);
    expect(searchState.dateFetchedPastNDays).toBe(7);
  });

  // ── 3. limit cap ──────────────────────────────────────────────────────────
  it("caps results at criteria.limit", async () => {
    // 2 hits in fixture but limit=1
    vi.stubGlobal("fetch", makeFetch(makeHtml([LEVER_HIT, GREENHOUSE_HIT])));

    const jobs = await hiringCafeSource.search({ query: "engineer", limit: 1 });
    expect(jobs).toHaveLength(1);
  });

  // ── 4. sparse hit safe defaults ───────────────────────────────────────────
  it("applies safe defaults for a sparse hit", async () => {
    const sparseHit = {
      id: "sparse___co___0001",
      // no apply_url
      job_information: {},
      v5_processed_job_data: {
        // only workplace_type available, no formatted_workplace_location
        workplace_type: "Remote",
        // no commitment, no salary, no company_name, no core_job_title
      },
    };

    vi.stubGlobal("fetch", makeFetch(makeHtml([sparseHit])));

    const jobs = await hiringCafeSource.search({ query: "anything" });
    expect(jobs).toHaveLength(1);
    const j = jobs[0];
    expect(j.source).toBe("hiringcafe");
    expect(j.externalId).toBe("sparse___co___0001");
    expect(j.title).toBe("Untitled");   // no core_job_title or title
    expect(j.company).toBe("Unknown"); // no company_name
    expect(j.location).toBe("Remote"); // fallback to workplace_type
    expect(j.salary).toBeNull();       // no compensation
    expect(j.jobType).toBeNull();      // no commitment
    expect(j.url).toBe("");            // no apply_url
    expect(j.applyUrl).toBeNull();     // no apply_url → null
    expect(j.description).toBe("");    // no requirements_summary
  });

  // ── 5a. throws on non-ok response ────────────────────────────────────────
  it("throws a clear error on non-ok HTTP response", async () => {
    vi.stubGlobal("fetch", makeFetch("Internal Server Error", 500));

    await expect(
      hiringCafeSource.search({ query: "qa" })
    ).rejects.toThrow(/Hiring\.Cafe.*500/i);
  });

  // ── 5b. throws when __NEXT_DATA__ is absent ───────────────────────────────
  it("throws a clear error when __NEXT_DATA__ script tag is absent", async () => {
    vi.stubGlobal("fetch", makeFetch("<html><body>No data here</body></html>"));

    await expect(
      hiringCafeSource.search({ query: "qa" })
    ).rejects.toThrow(/__NEXT_DATA__|ssrHits|parse/i);
  });

  // ── 5c. throws when ssrHits is absent ────────────────────────────────────
  it("throws a clear error when ssrHits is missing from pageProps", async () => {
    const badHtml = `<html><body>
      <script id="__NEXT_DATA__" type="application/json">{"props":{"pageProps":{}}}</script>
    </body></html>`;
    vi.stubGlobal("fetch", makeFetch(badHtml));

    await expect(
      hiringCafeSource.search({ query: "qa" })
    ).rejects.toThrow(/ssrHits|parse/i);
  });
});
