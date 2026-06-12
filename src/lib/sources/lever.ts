import type { ApplicantProfile, ApplyResult, JobApplier, NormalizedJob } from "./types";
import { browserApplyLever } from "./lever-browser";

export function isLeverUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return false;
    // Anchor to the jobs.lever.co domain: exact apex or a real subdomain.
    // A plain .includes() would accept hostile hosts like "jobs.lever.co.evil.com".
    const host = u.hostname.toLowerCase().replace(/\.$/, "");
    return host === "jobs.lever.co" || host.endsWith(".jobs.lever.co");
  } catch {
    return false;
  }
}

export const leverApplier: JobApplier = {
  id: "lever",
  canApply(job: NormalizedJob): boolean {
    return isLeverUrl(job.applyUrl ?? job.url);
  },
  // Lever's apply API requires a company-owned key; there is no anonymous API
  // path. Delegate directly to the browser filler.
  apply(job: NormalizedJob, profile: ApplicantProfile): Promise<ApplyResult> {
    return browserApplyLever(job, profile);
  },
};
