import { describe, it, expect } from "vitest";
import { matchField, ProfileAnswerRecord } from "@/lib/field-matcher";

const answers: ProfileAnswerRecord[] = [
  { fieldLabel: "Phone number", fieldType: "text", answer: "555-123-4567" },
  { fieldLabel: "Years of experience", fieldType: "select", answer: "8" },
  { fieldLabel: "Work authorization", fieldType: "radio", answer: "Yes" },
  { fieldLabel: "Website", fieldType: "text", answer: "https://jason-tur.com/" },
  { fieldLabel: "LinkedIn profile", fieldType: "text", answer: "https://linkedin.com/in/jason" },
];

describe("matchField", () => {
  it("matches exact label", () => { expect(matchField("Phone number", "text", answers)).toBe("555-123-4567"); });
  it("matches case-insensitive", () => { expect(matchField("phone number", "text", answers)).toBe("555-123-4567"); });
  it("matches partial label", () => { expect(matchField("Your phone number", "text", answers)).toBe("555-123-4567"); });
  it("matches years of experience variants", () => {
    expect(matchField("How many years of experience do you have?", "select", answers)).toBe("8");
    expect(matchField("Total years of relevant experience", "select", answers)).toBe("8");
  });
  it("matches website/portfolio variants", () => {
    expect(matchField("Portfolio URL", "text", answers)).toBe("https://jason-tur.com/");
    expect(matchField("Personal website", "text", answers)).toBe("https://jason-tur.com/");
  });
  it("returns null for unmatched", () => { expect(matchField("Describe your testing philosophy", "textarea", answers)).toBeNull(); });
  it("matches work authorization variants", () => {
    expect(matchField("Are you authorized to work in the US?", "radio", answers)).toBe("Yes");
    expect(matchField("Do you require visa sponsorship?", "radio", answers)).toBe("Yes");
  });
});
