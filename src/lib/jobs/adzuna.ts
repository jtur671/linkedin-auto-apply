export function formatSalary(
  min?: number,
  max?: number,
  predicted?: boolean,
): string | null {
  if (min == null && max == null) return null;
  const fmt = (n: number) => Math.round(n).toLocaleString("en-US");
  const range =
    min != null && max != null
      ? `${fmt(min)}–${fmt(max)}`
      : fmt((min ?? max) as number);
  return predicted ? `${range} (estimated)` : range;
}

export interface AdzunaRawResult {
  id: string | number;
  title?: string;
  company?: { display_name?: string };
  location?: { display_name?: string };
  description?: string;
  redirect_url?: string;
  salary_min?: number;
  salary_max?: number;
  salary_is_predicted?: string | number | boolean;
  contract_time?: string;
  contract_type?: string;
}

export interface NormalizedJob {
  externalId: string;
  title: string;
  company: string;
  location: string;
  salary: string | null;
  jobType: string | null;
  url: string;
  description: string;
}

/** Adzuna returns salary_is_predicted as "1"/"0" (occasionally numeric/boolean). */
function isPredictedSalary(flag?: string | number | boolean): boolean {
  return flag === true || flag === 1 || flag === "1";
}

export function mapAdzunaResult(r: AdzunaRawResult): NormalizedJob {
  return {
    externalId: String(r.id),
    title: r.title?.trim() || "Untitled",
    company: r.company?.display_name?.trim() || "Unknown",
    location: r.location?.display_name?.trim() || "",
    salary: formatSalary(r.salary_min, r.salary_max, isPredictedSalary(r.salary_is_predicted)),
    jobType: r.contract_time ?? r.contract_type ?? null,
    url: r.redirect_url ?? "",
    description: r.description?.trim() || "",
  };
}

const ADZUNA_BASE = "https://api.adzuna.com/v1/api/jobs";

export interface AdzunaConfig {
  appId: string;
  appKey: string;
  country: string;
}

export function getAdzunaConfig(): AdzunaConfig {
  return {
    appId: process.env.ADZUNA_APP_ID ?? "",
    appKey: process.env.ADZUNA_APP_KEY ?? "",
    country: (process.env.ADZUNA_COUNTRY ?? "us").toLowerCase(),
  };
}

export interface AdzunaSearchParams {
  what: string;
  where?: string;
  resultsPerPage?: number;
  maxDaysOld?: number;
}

export async function searchAdzuna(
  params: AdzunaSearchParams,
): Promise<NormalizedJob[]> {
  const { appId, appKey, country } = getAdzunaConfig();
  if (!appId || !appKey) {
    throw new Error(
      "Adzuna credentials missing. Set ADZUNA_APP_ID and ADZUNA_APP_KEY in your .env file.",
    );
  }
  const url = new URL(`${ADZUNA_BASE}/${country}/search/1`);
  url.searchParams.set("app_id", appId);
  url.searchParams.set("app_key", appKey);
  url.searchParams.set("results_per_page", String(params.resultsPerPage ?? 50));
  url.searchParams.set("what", params.what);
  if (params.where) url.searchParams.set("where", params.where);
  if (params.maxDaysOld) url.searchParams.set("max_days_old", String(params.maxDaysOld));
  url.searchParams.set("content-type", "application/json");

  const res = await fetch(url.toString());
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Adzuna API error ${res.status}: ${body}`);
  }
  const data = (await res.json()) as { results?: AdzunaRawResult[] };
  return (data.results ?? []).map(mapAdzunaResult);
}
