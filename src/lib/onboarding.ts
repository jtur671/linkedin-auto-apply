import { prisma } from "@/lib/db";

export async function checkOnboardingNeeded(): Promise<boolean> {
  const [credCount, configCount, answerCount] = await Promise.all([
    prisma.credential.count(),
    prisma.searchConfig.count(),
    prisma.profileAnswer.count(),
  ]);
  return credCount === 0 || configCount === 0 || answerCount === 0;
}
