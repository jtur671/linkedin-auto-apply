// src/lib/sources/types.ts
import type { ProfileAnswerRecord } from "@/lib/field-matcher";

/** A job normalized across all sources. */
export interface NormalizedJob {
  source: string; // adapter id, e.g. "adzuna"
  externalId: string; // unique within its source
  title: string;
  company: string;
  location: string;
  salary: string | null;
  jobType: string | null;
  url: string; // human-viewable listing URL
  applyUrl: string | null; // where to apply, when known
  description: string;
}

export interface JobSearchCriteria {
  query: string;
  location?: string;
  remote?: boolean;
  maxDaysOld?: number;
  limit?: number;
}

/** Can DISCOVER jobs. Adzuna implements this; Greenhouse does not. */
export interface JobSource {
  readonly id: string;
  readonly label: string;
  isConfigured(): boolean;
  search(criteria: JobSearchCriteria): Promise<NormalizedJob[]>;
}

/** Applicant data the appliers draw from. Refines the spec to reuse matchField. */
export interface ApplicantProfile {
  email: string;
  resumePath: string | null;
  answers: ProfileAnswerRecord[]; // every ProfileAnswer row; resolved via matchField
}

export type ApplyOutcome = "submitted" | "skipped" | "failed" | "needs_review";

export interface ApplyResult {
  outcome: ApplyOutcome;
  method: "api" | "browser";
  message?: string;
  screenshotPath?: string;
}

/** Can APPLY to a job. Greenhouse implements this; Adzuna does not. */
export interface JobApplier {
  readonly id: string;
  canApply(job: NormalizedJob): boolean;
  apply(job: NormalizedJob, profile: ApplicantProfile): Promise<ApplyResult>;
}
