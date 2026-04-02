import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/db";

describe("Onboarding Status API", () => {
  beforeEach(async () => {
    await prisma.credential.deleteMany();
    await prisma.searchConfig.deleteMany();
    await prisma.profileAnswer.deleteMany();
  });

  it("returns needsOnboarding true with empty DB", async () => {
    const { GET } = await import("@/app/api/onboarding/status/route");
    const res = await GET();
    const data = await res.json();
    expect(data.needsOnboarding).toBe(true);
  });

  it("returns needsOnboarding false after full setup", async () => {
    await prisma.credential.create({ data: { email: "e", password: "p", encryptionCheck: "c" } });
    await prisma.searchConfig.create({ data: { keywords: "QA", location: "", remotePreference: "any", experienceLevel: "senior", datePosted: "past_week" } });
    await prisma.profileAnswer.create({ data: { fieldLabel: "Phone", fieldType: "text", answer: "555" } });
    const { GET } = await import("@/app/api/onboarding/status/route");
    const res = await GET();
    const data = await res.json();
    expect(data.needsOnboarding).toBe(false);
  });
});
