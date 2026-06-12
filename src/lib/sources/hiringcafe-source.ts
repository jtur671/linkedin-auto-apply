// src/lib/sources/hiringcafe-source.ts
//
// Hiring.Cafe job-source adapter (M2 — discovery only, no auth required).
//
// NOTE ON FRAGILITY: This adapter parses the __NEXT_DATA__ SSR payload that
// Next.js embeds in the HTML. That shape is an internal implementation detail
// of hiring.cafe and may change without notice. A loud parse failure here beats
// silently returning zero jobs, so we throw on any unexpected shape.
//
// NOTE ON DESCRIPTIONS: hiring.cafe returns only a `requirements_summary`
// (short text) in the search SSR payload. The full job description requires a
// separate per-job API call. This is deliberately skipped in M2 to keep
// discovery fast; a follow-up step can hydrate full descriptions if needed.

import type { JobSource, JobSearchCriteria, NormalizedJob } from "./types";
import { formatSalary } from "@/lib/jobs/adzuna";

const HIRINGCAFE_BASE = "https://hiring.cafe/";

const CHROME_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

interface HiringCafeV5 {
  core_job_title?: string;
  company_name?: string;
  formatted_workplace_location?: string;
  workplace_type?: string;
  yearly_min_compensation?: number;
  yearly_max_compensation?: number;
  commitment?: string[];
  requirements_summary?: string;
}

interface HiringCafeHit {
  id?: string;
  apply_url?: string;
  job_information?: { title?: string };
  v5_processed_job_data?: HiringCafeV5;
}

function buildUrl(criteria: JobSearchCriteria): string {
  const searchState: Record<string, unknown> = {
    searchQuery: criteria.query,
    sortBy: "date",
  };
  if (criteria.remote) {
    searchState.workplaceTypes = ["Remote"];
  }
  if (criteria.maxDaysOld != null) {
    searchState.dateFetchedPastNDays = criteria.maxDaysOld;
  }

  const params = new URLSearchParams({
    searchState: JSON.stringify(searchState),
    page: "1",
  });
  return `${HIRINGCAFE_BASE}?${params.toString()}`;
}

function extractSsrHits(html: string): HiringCafeHit[] {
  const match = html.match(
    /<script\s+id="__NEXT_DATA__"\s+type="application\/json">([\s\S]*?)<\/script>/
  );
  if (!match) {
    throw new Error(
      "Hiring.Cafe: could not parse response — __NEXT_DATA__ script tag not found. " +
        "The site's SSR shape may have changed."
    );
  }

  let data: { props?: { pageProps?: { ssrHits?: unknown } } };
  try {
    data = JSON.parse(match[1]);
  } catch (e) {
    throw new Error(`Hiring.Cafe: failed to parse __NEXT_DATA__ JSON: ${e}`);
  }

  const ssrHits = data?.props?.pageProps?.ssrHits;
  if (!Array.isArray(ssrHits)) {
    throw new Error(
      "Hiring.Cafe: could not parse ssrHits — props.pageProps.ssrHits is missing or not an array. " +
        "The site's SSR shape may have changed."
    );
  }

  return ssrHits as HiringCafeHit[];
}

function mapHit(hit: HiringCafeHit): NormalizedJob {
  const v5 = hit.v5_processed_job_data ?? {};
  const applyUrl = hit.apply_url || null;

  const title =
    (v5.core_job_title?.trim() ||
      hit.job_information?.title?.trim() ||
      "Untitled");

  const company = v5.company_name?.trim() || "Unknown";

  const location =
    v5.formatted_workplace_location?.trim() ||
    v5.workplace_type?.trim() ||
    "";

  const salary = formatSalary(
    v5.yearly_min_compensation,
    v5.yearly_max_compensation
  );

  const jobType = v5.commitment?.[0] ?? null;

  const description = v5.requirements_summary?.trim() ?? "";

  return {
    source: "hiringcafe",
    externalId: hit.id ?? "",
    title,
    company,
    location,
    salary,
    jobType,
    url: applyUrl ?? "",
    applyUrl,
    description,
  };
}

export const hiringCafeSource: JobSource = {
  id: "hiringcafe",
  label: "Hiring Cafe",

  isConfigured() {
    return true; // No API key required.
  },

  async search(criteria: JobSearchCriteria): Promise<NormalizedJob[]> {
    const limit = criteria.limit ?? 50;
    const url = buildUrl(criteria);

    const res = await fetch(url, {
      headers: {
        "User-Agent": CHROME_UA,
        Accept: "text/html",
      },
    });

    if (!res.ok) {
      throw new Error(
        `Hiring.Cafe HTTP error ${res.status} fetching jobs.`
      );
    }

    const html = await res.text();
    const hits = extractSsrHits(html);

    return hits.slice(0, limit).map(mapHit);
  },
};
