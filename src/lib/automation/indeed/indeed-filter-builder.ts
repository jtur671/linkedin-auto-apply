import type { SearchParams } from "@/lib/filter-builder";

const DATE_MAP: Record<string, string> = {
  past_24_hours: "1",
  past_week: "7",
  past_month: "30",
};

const EXPERIENCE_MAP: Record<string, string> = {
  entry: "entry_level",
  mid: "mid_level",
  senior: "senior_level",
};

const RESULTS_PER_PAGE = 10;

export function buildIndeedSearchUrl(
  params: SearchParams,
  page: number = 0,
): string {
  const query = new URLSearchParams();
  query.set("q", params.keywords);

  if (params.location) query.set("l", params.location);

  if (params.datePosted && params.datePosted !== "any") {
    query.set("fromage", DATE_MAP[params.datePosted]);
  }

  if (params.experienceLevel) {
    query.set("explvl", EXPERIENCE_MAP[params.experienceLevel]);
  }

  if (params.remotePreference === "remote") {
    query.set("remotejob", "032b3046-06a3-4876-8dfd-474eb5e7ed11");
  }

  if (page > 0) {
    query.set("start", String(page * RESULTS_PER_PAGE));
  }

  return `https://www.indeed.com/jobs?${query.toString()}`;
}
