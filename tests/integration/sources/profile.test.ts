import { describe, it, expect } from "vitest";
import { prisma } from "@/lib/db";
import { assembleApplicantProfile } from "@/lib/sources/profile";

describe("assembleApplicantProfile", () => {
  it("pulls email, active resume path, and all profile answers", async () => {
    await prisma.credential.create({
      data: { email: "jo@x.com", password: "enc", encryptionCheck: "ok" },
    });
    await prisma.resume.create({
      data: { filename: "cv.pdf", content: "text", rawPath: "/uploads/cv.pdf", isActive: true },
    });
    await prisma.profileAnswer.create({
      data: { fieldLabel: "Phone number", fieldType: "text", answer: "555-1234" },
    });

    const profile = await assembleApplicantProfile();

    expect(profile.email).toBe("jo@x.com");
    expect(profile.resumePath).toBe("/uploads/cv.pdf");
    expect(profile.answers).toEqual([
      { fieldLabel: "Phone number", fieldType: "text", answer: "555-1234" },
    ]);
  });

  it("tolerates a missing resume", async () => {
    await prisma.credential.create({
      data: { email: "jo@x.com", password: "enc", encryptionCheck: "ok" },
    });
    const profile = await assembleApplicantProfile();
    expect(profile.resumePath).toBeNull();
    expect(profile.answers).toEqual([]);
  });
});
