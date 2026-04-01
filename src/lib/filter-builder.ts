export interface SearchParams {
  keywords: string;
  location?: string;
  remotePreference?: "remote" | "hybrid" | "onsite" | "any";
  experienceLevel?: "entry" | "mid" | "senior";
  datePosted?: "past_24_hours" | "past_week" | "past_month" | "any";
}

const REMOTE_MAP: Record<string, string> = { remote: "2", hybrid: "3", onsite: "1" };
const DATE_MAP: Record<string, string> = { past_24_hours: "r86400", past_week: "r604800", past_month: "r2592000" };
const EXPERIENCE_MAP: Record<string, string> = { entry: "2", mid: "3", senior: "4" };
const RESULTS_PER_PAGE = 25;

export function buildSearchUrl(params: SearchParams, page: number = 0): string {
  const query = new URLSearchParams();
  query.set("keywords", params.keywords);
  query.set("f_AL", "true");
  if (params.location) query.set("location", params.location);
  if (params.remotePreference && params.remotePreference !== "any") query.set("f_WT", REMOTE_MAP[params.remotePreference]);
  if (params.datePosted && params.datePosted !== "any") query.set("f_TPR", DATE_MAP[params.datePosted]);
  if (params.experienceLevel) query.set("f_E", EXPERIENCE_MAP[params.experienceLevel]);
  if (page > 0) query.set("start", String(page * RESULTS_PER_PAGE));
  return `https://www.linkedin.com/jobs/search/?${query.toString()}`;
}
