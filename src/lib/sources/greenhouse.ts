import { matchField } from "@/lib/field-matcher";
import type { ApplicantProfile } from "./types";

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
