import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/db";
import { matchField } from "@/lib/field-matcher";

describe("Profile Answers DB + Field Matcher", () => {
  beforeEach(async () => { await prisma.profileAnswer.deleteMany(); });

  it("creates and retrieves profile answers", async () => {
    await prisma.profileAnswer.create({ data: { fieldLabel: "Phone", fieldType: "text", answer: "555" } });
    const answers = await prisma.profileAnswer.findMany();
    expect(answers).toHaveLength(1);
  });

  it("uses DB answers with field matcher", async () => {
    await prisma.profileAnswer.createMany({
      data: [
        { fieldLabel: "Phone number", fieldType: "text", answer: "555-1234" },
        { fieldLabel: "Website", fieldType: "text", answer: "https://jason-tur.com/" },
      ],
    });
    const dbAnswers = await prisma.profileAnswer.findMany();
    const answers = dbAnswers.map(a => ({ fieldLabel: a.fieldLabel, fieldType: a.fieldType, answer: a.answer }));
    expect(matchField("Phone number", "text", answers)).toBe("555-1234");
    expect(matchField("Portfolio URL", "text", answers)).toBe("https://jason-tur.com/");
  });
});
