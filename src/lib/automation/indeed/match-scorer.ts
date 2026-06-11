import { z } from "zod";
import { callAndParse } from "@/lib/ai/client";
import { prisma } from "@/lib/db";

const MatchResultSchema = z.object({
  score: z.number().min(0).max(100),
  summary: z.string(),
  matchedRequirements: z.array(z.number()),
});

const MATCH_SYSTEM_PROMPT = `You are a recruiter evaluating how well a candidate matches a job. You will receive:
1. The candidate's resume text
2. The candidate's profile answers (key skills, experience, etc.)
3. A numbered list of job requirements

Score the candidate 0-100 based on how many requirements they meet.
- 90-100: Exceptional match, meets nearly all requirements
- 70-89: Strong match, meets most key requirements
- 50-69: Moderate match, meets some requirements
- 30-49: Weak match, missing several key requirements
- 0-29: Poor match, missing most requirements

For each numbered requirement, determine if the candidate matches it.

Respond ONLY with valid JSON:
{
  "score": number,
  "summary": "2-sentence summary of fit. First sentence: what matches. Second sentence: what's missing.",
  "matchedRequirements": [array of requirement numbers (1-indexed) that the candidate matches]
}`;

function buildUserPrompt(
  resumeText: string,
  profileAnswers: { fieldLabel: string; answer: string }[],
  requirements: { id: number; requirement: string; isRequired: boolean }[],
): string {
  const profileSection = profileAnswers
    .map((a) => `${a.fieldLabel}: ${a.answer}`)
    .join("\n");

  const reqSection = requirements
    .map((r, i) => `${i + 1}. [${r.isRequired ? "Required" : "Preferred"}] ${r.requirement}`)
    .join("\n");

  return `CANDIDATE RESUME:
${resumeText.slice(0, 6000)}

CANDIDATE PROFILE:
${profileSection}

JOB REQUIREMENTS:
${reqSection}`;
}

export async function scoreJobMatch(jobId: number): Promise<void> {
  // Load resume
  const resume = await prisma.resume.findFirst({
    where: { isActive: true },
    orderBy: { uploadedAt: "desc" },
  });

  if (!resume) return; // No resume uploaded, skip scoring

  // Load profile answers
  const answers = await prisma.profileAnswer.findMany();

  // Load job requirements
  const requirements = await prisma.indeedRequirement.findMany({
    where: { jobId },
  });

  if (requirements.length === 0) return;

  const result = await callAndParse(
    MATCH_SYSTEM_PROMPT,
    buildUserPrompt(
      resume.content,
      answers.map((a) => ({ fieldLabel: a.fieldLabel, answer: a.answer })),
      requirements.map((r) => ({
        id: r.id,
        requirement: r.requirement,
        isRequired: r.isRequired,
      })),
    ),
    MatchResultSchema,
  );

  // Update job with score
  await prisma.indeedJob.update({
    where: { id: jobId },
    data: {
      matchScore: result.score,
      matchSummary: result.summary,
    },
  });

  // Update matched status on each requirement
  const matchedIndices = new Set(result.matchedRequirements);
  for (let i = 0; i < requirements.length; i++) {
    const isMatched = matchedIndices.has(i + 1);
    if (requirements[i].matched !== isMatched) {
      await prisma.indeedRequirement.update({
        where: { id: requirements[i].id },
        data: { matched: isMatched },
      });
    }
  }
}

export async function scoreAllUnscored(): Promise<number> {
  const unscoredJobs = await prisma.indeedJob.findMany({
    where: { matchScore: null },
    select: { id: true },
  });

  let scored = 0;
  for (const job of unscoredJobs) {
    try {
      await scoreJobMatch(job.id);
      scored++;
      // Delay between AI calls
      await new Promise((r) => setTimeout(r, 1000));
    } catch {
      // Continue scoring other jobs
    }
  }

  return scored;
}
