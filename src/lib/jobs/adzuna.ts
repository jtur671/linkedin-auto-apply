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

export function mapAdzunaResult(r: AdzunaRawResult): NormalizedJob {
  return {
    externalId: String(r.id),
    title: r.title?.trim() || "Untitled",
    company: r.company?.display_name?.trim() || "Unknown",
    location: r.location?.display_name?.trim() || "",
    salary: formatSalary(r.salary_min, r.salary_max, !!Number(r.salary_is_predicted)),
    jobType: r.contract_time ?? r.contract_type ?? null,
    url: r.redirect_url ?? "",
    description: r.description?.trim() || "",
  };
}
