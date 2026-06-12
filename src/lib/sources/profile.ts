import { prisma } from "@/lib/db";
import type { ApplicantProfile } from "./types";
import type { ProfileAnswerRecord } from "@/lib/field-matcher";

export async function assembleApplicantProfile(): Promise<ApplicantProfile> {
  const [credential, resume, answerRows] = await Promise.all([
    prisma.credential.findFirst(),
    prisma.resume.findFirst({ where: { isActive: true }, orderBy: { uploadedAt: "desc" } }),
    prisma.profileAnswer.findMany(),
  ]);

  const answers: ProfileAnswerRecord[] = answerRows.map((a) => ({
    fieldLabel: a.fieldLabel,
    fieldType: a.fieldType,
    answer: a.answer,
  }));

  return {
    email: credential?.email ?? "",
    resumePath: resume?.rawPath ?? null,
    answers,
  };
}
