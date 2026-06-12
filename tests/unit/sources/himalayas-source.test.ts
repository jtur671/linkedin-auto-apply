import { describe, it, expect, vi, afterEach } from "vitest";
import { himalayasSource } from "@/lib/sources/himalayas-source";

afterEach(() => {
  vi.unstubAllGlobals();
});

// Realistic fixture mirroring the actual Himalayas API response shape.
const FULL_JOB = {
  guid: "https://himalayas.app/companies/coterie-insurance/jobs/liability-claims-specialist",
  title: "Liability Claims Specialist",
  excerpt:
    "Who we are: Through a partnership-based approach, Coterie helps insurance professionals.",
  description: "<p>Full description here</p>",
  companyName: "Coterie Insurance",
  companySlug: "coterie-insurance",
  companyLogo:
    "https://cdn-images.himalayas.app/v71dpbgz266g9f4d9c5frxvpszqe",
  employmentType: "Full Time",
  minSalary: 75000,
  maxSalary: 110000,
  salaryPeriod: "annual",
  currency: "USD",
  locationRestrictions: ["United States"],
  timezoneRestrictions: [-10, -9, -8, -7, -6, -5, 14],
  categories: ["Claims-Adjusting"],
  parentCategories: [],
  seniority: ["Senior"],
  pubDate: 1781280664,
  expiryDate: 1786464662,
  applicationLink:
    "https://himalayas.app/companies/coterie-insurance/jobs/liability-claims-specialist",
};

const SPARSE_JOB = {
  guid: "https://himalayas.app/companies/acme/jobs/dev",
  title: "  Developer  ",
  companyName: "",
  locationRestrictions: [],
  applicationLink: "https://himalayas.app/companies/acme/jobs/dev",
};

function makeFetch(jobs: unknown[]) {
  return vi.fn(async () => ({
    ok: true,
    json: async () => ({ jobs }),
  }));
}

describe("himalayasSource", () => {
  // ── 1. identity ──────────────────────────────────────────────────────────
  it("has id 'himalayas', a label, and isConfigured() === true", () => {
    expect(himalayasSource.id).toBe("himalayas");
    expect(himalayasSource.label).toBeTruthy();
    expect(himalayasSource.isConfigured()).toBe(true);
  });

  // ── 2. full mapping + client-side filtering ───────────────────────────────
  it("maps a realistic fixture and filters by query", async () => {
    // Two jobs: one matching "claims", one that does not.
    const otherJob = { ...FULL_JOB, guid: "https://himalayas.app/companies/x/jobs/y", title: "Unrelated Role", description: "nothing relevant" };
    vi.stubGlobal("fetch", makeFetch([FULL_JOB, otherJob]));

    const jobs = await himalayasSource.search({ query: "claims", limit: 10 });

    // Only the matching job should come back.
    expect(jobs).toHaveLength(1);
    const j = jobs[0];
    expect(j.source).toBe("himalayas");
    expect(j.externalId).toBe(
      "https://himalayas.app/companies/coterie-insurance/jobs/liability-claims-specialist"
    );
    expect(j.title).toBe("Liability Claims Specialist");
    expect(j.company).toBe("Coterie Insurance");
    expect(j.location).toBe("United States");
    expect(j.salary).toBe("75,000–110,000");
    expect(j.jobType).toBe("Full Time");
    expect(j.url).toBe(
      "https://himalayas.app/companies/coterie-insurance/jobs/liability-claims-specialist"
    );
    expect(j.applyUrl).toBe(
      "https://himalayas.app/companies/coterie-insurance/jobs/liability-claims-specialist"
    );
    expect(j.description).toContain("Full description");
  });

  // ── 3. safe defaults for sparse job ─────────────────────────────────────
  it("handles a sparse job gracefully", async () => {
    vi.stubGlobal("fetch", makeFetch([SPARSE_JOB]));

    // Empty query matches everything.
    const jobs = await himalayasSource.search({ query: "" });

    expect(jobs).toHaveLength(1);
    const j = jobs[0];
    expect(j.title).toBe("Developer"); // trimmed
    expect(j.company).toBe("Unknown");
    expect(j.location).toBe("Remote"); // empty locationRestrictions → "Remote"
    expect(j.salary).toBeNull();
    expect(j.jobType).toBeNull();
    expect(j.applyUrl).toBe("https://himalayas.app/companies/acme/jobs/dev");
    expect(j.description).toBe(""); // no description, no excerpt
  });

  // ── 4. throws on non-ok response ────────────────────────────────────────
  it("throws a clear error on non-ok HTTP response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 500,
        text: async () => "Internal Server Error",
      }))
    );

    await expect(himalayasSource.search({ query: "dev" })).rejects.toThrow(
      /Himalayas API error 500/
    );
  });
});
