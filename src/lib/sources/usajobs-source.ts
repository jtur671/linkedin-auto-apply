import type { JobSource, JobSearchCriteria, NormalizedJob } from "./types";
import { formatSalary } from "@/lib/jobs/adzuna";

const USAJOBS_BASE = "https://data.usajobs.gov/api/search";

function getUsajobsConfig() {
  return {
    apiKey: process.env.USAJOBS_API_KEY ?? "",
    userAgent: process.env.USAJOBS_USER_AGENT ?? "",
  };
}

// ---------------------------------------------------------------------------
// Raw response shapes
// ---------------------------------------------------------------------------

interface UsajobsRemuneration {
  MinimumRange?: string;
  MaximumRange?: string;
  RateIntervalCode?: string;
}

interface UsajobsDescriptor {
  PositionID?: string;
  PositionTitle?: string;
  OrganizationName?: string;
  PositionLocationDisplay?: string;
  PositionURI?: string;
  ApplyURI?: string[];
  PositionRemuneration?: UsajobsRemuneration[];
  UserArea?: { Details?: { JobSummary?: string } };
}

interface UsajobsItem {
  MatchedObjectId?: string;
  MatchedObjectDescriptor?: UsajobsDescriptor;
}

interface UsajobsResponse {
  SearchResult?: {
    SearchResultItems?: UsajobsItem[];
  };
}

// ---------------------------------------------------------------------------
// Mapper
// ---------------------------------------------------------------------------

function mapUsajobsItem(item: UsajobsItem): NormalizedJob {
  const d = item.MatchedObjectDescriptor ?? {};
  const externalId = item.MatchedObjectId || d.PositionID || "";

  // Salary: use first remuneration entry if present
  let salary: string | null = null;
  const rem = d.PositionRemuneration;
  if (rem && rem.length > 0) {
    const r = rem[0];
    const min = r.MinimumRange != null ? parseFloat(r.MinimumRange) : undefined;
    const max = r.MaximumRange != null ? parseFloat(r.MaximumRange) : undefined;
    if (min != null || max != null) {
      salary = formatSalary(min, max);
    }
  }

  const uri = d.PositionURI ?? "";

  // applyUrl: first non-empty ApplyURI entry, else PositionURI, else null; never ""
  const rawApply = d.ApplyURI?.find((u) => u.trim() !== "");
  const applyUrl = rawApply || uri || null;

  return {
    source: "usajobs",
    externalId,
    title: d.PositionTitle?.trim() || "Untitled",
    company: d.OrganizationName?.trim() || "Unknown",
    location: d.PositionLocationDisplay ?? "",
    salary,
    jobType: null,
    url: uri,
    applyUrl,
    description: d.UserArea?.Details?.JobSummary ?? "",
  };
}

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

export const usajobsSource: JobSource = {
  id: "usajobs",
  label: "USAJOBS",

  isConfigured(): boolean {
    const { apiKey, userAgent } = getUsajobsConfig();
    return Boolean(apiKey && userAgent);
  },

  async search(criteria: JobSearchCriteria): Promise<NormalizedJob[]> {
    const { apiKey, userAgent } = getUsajobsConfig();
    if (!apiKey || !userAgent) {
      throw new Error(
        "USAJOBS credentials missing. Set USAJOBS_API_KEY and USAJOBS_USER_AGENT in your .env file.",
      );
    }

    const url = new URL(USAJOBS_BASE);
    url.searchParams.set("Keyword", criteria.query);
    url.searchParams.set("ResultsPerPage", String(criteria.limit ?? 50));
    if (criteria.location) {
      url.searchParams.set("LocationName", criteria.location);
    }

    const res = await fetch(url.toString(), {
      headers: {
        "Authorization-Key": apiKey,
        "User-Agent": userAgent,
        "Host": "data.usajobs.gov",
      },
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`USAJOBS API error ${res.status}: ${body}`);
    }

    const data = (await res.json()) as UsajobsResponse;
    return (data.SearchResult?.SearchResultItems ?? []).map(mapUsajobsItem);
  },
};
