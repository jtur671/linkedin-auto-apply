import type { JobSource, JobSearchCriteria, NormalizedJob } from "./types";
import { formatSalary } from "@/lib/jobs/adzuna";

const HIMALAYAS_API = "https://himalayas.app/jobs/api";

/** Raw job shape returned by the Himalayas public jobs API. */
interface HimalayasRawJob {
  guid?: string;
  title?: string;
  excerpt?: string;
  description?: string;
  companyName?: string;
  employmentType?: string;
  minSalary?: number | null;
  maxSalary?: number | null;
  currency?: string | null;
  locationRestrictions?: string[];
  applicationLink?: string;
}

function mapHimalayasJob(r: HimalayasRawJob): NormalizedJob {
  const applyUrl = r.applicationLink || null;
  const locationRestrictions = r.locationRestrictions ?? [];
  const location =
    locationRestrictions.length > 0
      ? locationRestrictions.join(", ")
      : "Remote";

  const salary =
    r.minSalary != null || r.maxSalary != null
      ? formatSalary(r.minSalary ?? undefined, r.maxSalary ?? undefined)
      : null;

  return {
    source: "himalayas",
    externalId: String(r.guid ?? ""),
    title: r.title?.trim() || "Untitled",
    company: r.companyName?.trim() || "Unknown",
    location,
    salary,
    jobType: r.employmentType?.trim() || null,
    url: applyUrl ?? "",
    applyUrl,
    description: r.description?.trim() || r.excerpt?.trim() || "",
  };
}

/**
 * Filter jobs client-side: every whitespace-separated term in the query must
 * appear (case-insensitive) in the job's title or description/excerpt.
 */
function matchesQuery(raw: HimalayasRawJob, query: string): boolean {
  if (!query) return true;
  const haystack = [raw.title, raw.description, raw.excerpt]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((term) => haystack.includes(term));
}

export const himalayasSource: JobSource = {
  id: "himalayas",
  label: "Himalayas",

  isConfigured() {
    return true; // public API — no credentials needed
  },

  async search(criteria: JobSearchCriteria): Promise<NormalizedJob[]> {
    const limit = criteria.limit ?? 50;
    // Fetch more than we need so client-side filtering leaves enough results.
    const fetchLimit = Math.max(limit * 4, 100);

    const url = new URL(HIMALAYAS_API);
    url.searchParams.set("limit", String(fetchLimit));

    const res = await fetch(url.toString());
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Himalayas API error ${res.status}: ${body}`);
    }

    const data = (await res.json()) as { jobs?: HimalayasRawJob[] };
    const rawJobs = data.jobs ?? [];

    return rawJobs
      .filter((j) => matchesQuery(j, criteria.query))
      .slice(0, limit)
      .map(mapHimalayasJob);
  },
};
