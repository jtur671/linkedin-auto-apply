import { matchField } from "@/lib/field-matcher";
import type { ApplicantProfile, ApplyResult, JobApplier, NormalizedJob } from "./types";
import { isGreenhouseUrl, parseGreenhouseUrl } from "./greenhouse-url";
import { browserApplyGreenhouse } from "./greenhouse-browser";

export interface GreenhouseField {
  name: string;
  type: string;
}
export interface GreenhouseQuestion {
  label: string;
  required: boolean;
  fields: GreenhouseField[];
}

const isFileField = (q: GreenhouseQuestion) =>
  q.fields.every((f) => f.type.includes("file"));

export function mapGreenhouseAnswers(
  questions: GreenhouseQuestion[],
  profile: ApplicantProfile,
): { fields: Record<string, string>; missingRequired: string[] } {
  const fields: Record<string, string> = {};
  const missingRequired: string[] = [];

  for (const q of questions) {
    if (isFileField(q)) continue; // resume handled separately
    const answer = matchField(q.label, q.fields[0]?.type ?? "", profile.answers);
    if (answer != null) {
      for (const f of q.fields) fields[f.name] = answer;
    } else if (q.required) {
      missingRequired.push(q.label);
    }
  }
  return { fields, missingRequired };
}

const BOARDS_API = "https://boards-api.greenhouse.io/v1/boards";

export const greenhouseApplier: JobApplier = {
  id: "greenhouse",
  canApply(job: NormalizedJob): boolean {
    return isGreenhouseUrl(job.applyUrl ?? job.url);
  },
  async apply(job: NormalizedJob, profile: ApplicantProfile): Promise<ApplyResult> {
    const parsed = parseGreenhouseUrl(job.applyUrl ?? job.url);
    if (!parsed) return { outcome: "failed", method: "api", message: "Unrecognized Greenhouse URL" };
    const { token, jobId } = parsed;

    let questions: GreenhouseQuestion[];
    try {
      const res = await fetch(`${BOARDS_API}/${token}/jobs/${jobId}?questions=true`);
      if (!res.ok) return { outcome: "failed", method: "api", message: `Board fetch ${res.status}` };
      questions = ((await res.json()) as { questions?: GreenhouseQuestion[] }).questions ?? [];
    } catch (e) {
      return { outcome: "failed", method: "api", message: String(e) };
    }

    const { fields, missingRequired } = mapGreenhouseAnswers(questions, profile);
    if (missingRequired.length) {
      return { outcome: "needs_review", method: "api", message: `Unanswered required: ${missingRequired.join(", ")}` };
    }

    let submit: Response;
    try {
      submit = await fetch(`${BOARDS_API}/${token}/jobs/${jobId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...fields, email: profile.email }),
      });
    } catch (e) {
      return { outcome: "failed", method: "api", message: String(e) };
    }
    if (submit.ok) return { outcome: "submitted", method: "api" };
    // The anonymous API POST was rejected — an auth-gated/private board, or
    // server-side validation we can't satisfy on the API path (notably a
    // required resume, which the API body doesn't attach). Fall back to the
    // browser form, which fills the standard fields and uploads the resume.
    return browserApplyGreenhouse(job, profile);
  },
};
