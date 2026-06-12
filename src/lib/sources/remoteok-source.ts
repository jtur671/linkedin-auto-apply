import type { JobSource, JobSearchCriteria, NormalizedJob } from "./types";
import { formatSalary } from "@/lib/jobs/adzuna";

const REMOTEOK_API = "https://remoteok.com/api";

interface RemoteOkRawJob {
  id: string | number;
  slug?: string;
  position?: string;
  company?: string;
  location?: string;
  tags?: string[];
  description?: string;
  url?: string;
  apply_url?: string;
  salary_min?: number;
  salary_max?: number;
}

/** The first element of the array is a metadata/legal notice with no id/position. */
function isJobItem(item: unknown): item is RemoteOkRawJob {
  return (
    item !== null &&
    typeof item === "object" &&
    "id" in (item as object) &&
    "position" in (item as object)
  );
}

function mapRemoteOkJob(r: RemoteOkRawJob): NormalizedJob {
  const url = r.url ?? "";
  const rawApply = r.apply_url ?? "";
  const applyUrl = rawApply || url || null;

  const salaryMin = r.salary_min && r.salary_min > 0 ? r.salary_min : undefined;
  const salaryMax = r.salary_max && r.salary_max > 0 ? r.salary_max : undefined;

  return {
    source: "remoteok",
    externalId: String(r.id),
    title: r.position?.trim() || "Untitled",
    company: r.company?.trim() || "Unknown",
    location: r.location?.trim() || "Remote",
    salary: formatSalary(salaryMin, salaryMax),
    jobType: null,
    url,
    applyUrl,
    description: r.description?.trim() || "",
  };
}

/** Build a searchable haystack string for a job item. */
function buildHaystack(r: RemoteOkRawJob): string {
  return [
    r.position ?? "",
    ...(r.tags ?? []),
    r.description ?? "",
  ]
    .join(" ")
    .toLowerCase();
}

/** Returns true if every whitespace-separated term in the query appears in the haystack. */
function matchesQuery(haystack: string, query: string): boolean {
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((term) => haystack.includes(term));
}

export const remoteOkSource: JobSource = {
  id: "remoteok",
  label: "RemoteOK",

  isConfigured() {
    return true; // No auth required
  },

  async search(criteria: JobSearchCriteria): Promise<NormalizedJob[]> {
    const res = await fetch(REMOTEOK_API, {
      headers: { "User-Agent": "JobSearchBot/1.0" },
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`RemoteOK API error ${res.status}: ${body}`);
    }

    const data = (await res.json()) as unknown[];
    const limit = criteria.limit ?? 50;

    const results: NormalizedJob[] = [];
    for (const item of data) {
      if (!isJobItem(item)) continue; // skip metadata/legal first element

      const haystack = buildHaystack(item);
      if (!matchesQuery(haystack, criteria.query)) continue;

      results.push(mapRemoteOkJob(item));
      if (results.length >= limit) break;
    }

    return results;
  },
};
