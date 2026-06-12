// src/lib/sources/ashby.ts
//
// Ashby-hosted job boards (jobs.ashbyhq.com / *.ashbyhq.com) use dynamic,
// per-board React forms with custom fields and no public anonymous submit API.
// Rather than guessing at field mappings and silently failing, this applier
// recognises Ashby URLs so they are RECOGNISED and queued for manual review
// instead of falling through as "silently unsupported".
//
// Revisit with a real form-filler if Ashby ever exposes a stable submit path.

import type { JobApplier, NormalizedJob, ApplicantProfile, ApplyResult } from "./types";

/**
 * Returns true only when `url` is a genuine ashbyhq.com host over HTTPS.
 * Uses the same anchored-host pattern as greenhouse-url.ts to prevent
 * bypass via hosts like "jobs.ashbyhq.com.evil.com".
 */
function isAshbyUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return false;
    // Anchor to ashbyhq.com: exact apex or a real subdomain.
    // A plain .includes() would accept hostile hosts like "ashbyhq.com.evil.com".
    const host = u.hostname.toLowerCase().replace(/\.$/, "");
    return host === "ashbyhq.com" || host.endsWith(".ashbyhq.com");
  } catch {
    return false;
  }
}

export const ashbyApplier: JobApplier = {
  id: "ashby",

  canApply(job: NormalizedJob): boolean {
    return isAshbyUrl(job.applyUrl ?? job.url);
  },

  async apply(
    _job: NormalizedJob,
    _profile: ApplicantProfile,
  ): Promise<ApplyResult> {
    // Ashby uses dynamic per-board React forms with custom fields and no
    // public anonymous submit API — we cannot reliably auto-fill these.
    // Queue for manual review rather than attempting a blind submission.
    return {
      outcome: "needs_review",
      method: "api",
      message:
        "Ashby applications need manual completion (no anonymous submit path); queued for review",
    };
  },
};
