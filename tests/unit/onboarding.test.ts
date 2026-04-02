import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/db";
import { checkOnboardingNeeded } from "@/lib/onboarding";

describe("checkOnboardingNeeded", () => {
  beforeEach(async () => {
    await prisma.credential.deleteMany();
    await prisma.searchConfig.deleteMany();
    await prisma.profileAnswer.deleteMany();
  });

  it("returns true when DB is empty", async () => {
    expect(await checkOnboardingNeeded()).toBe(true);
  });

  it("returns false when all three exist", async () => {
    await prisma.credential.create({ data: { email: "enc", password: "enc", encryptionCheck: "enc" } });
    await prisma.searchConfig.create({ data: { keywords: "QA", location: "", remotePreference: "any", experienceLevel: "senior", datePosted: "past_week" } });
    await prisma.profileAnswer.create({ data: { fieldLabel: "Phone", fieldType: "text", answer: "555" } });
    expect(await checkOnboardingNeeded()).toBe(false);
  });

  it("returns true when only credentials exist", async () => {
    await prisma.credential.create({ data: { email: "enc", password: "enc", encryptionCheck: "enc" } });
    expect(await checkOnboardingNeeded()).toBe(true);
  });
});
