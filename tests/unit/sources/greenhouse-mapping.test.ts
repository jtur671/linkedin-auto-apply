import { describe, it, expect } from "vitest";
import { mapGreenhouseAnswers, type GreenhouseQuestion } from "@/lib/sources/greenhouse";
import type { ApplicantProfile } from "@/lib/sources/types";

const profile: ApplicantProfile = {
  email: "jo@x.com",
  resumePath: "/cv.pdf",
  answers: [
    { fieldLabel: "First name", fieldType: "text", answer: "Jo" },
    { fieldLabel: "Phone number", fieldType: "text", answer: "555-1234" },
  ],
};

describe("mapGreenhouseAnswers", () => {
  it("resolves answered questions and skips file fields", () => {
    const questions: GreenhouseQuestion[] = [
      { label: "First name", required: true, fields: [{ name: "first_name", type: "input_text" }] },
      { label: "Phone", required: true, fields: [{ name: "phone", type: "input_text" }] },
      { label: "Resume", required: true, fields: [{ name: "resume", type: "input_file" }] },
    ];
    const { fields, missingRequired } = mapGreenhouseAnswers(questions, profile);
    expect(fields).toEqual({ first_name: "Jo", phone: "555-1234" });
    expect(missingRequired).toEqual([]); // file field is not "missing"
  });

  it("flags required questions it cannot answer", () => {
    const questions: GreenhouseQuestion[] = [
      { label: "Why do you want this job?", required: true, fields: [{ name: "q1", type: "textarea" }] },
      { label: "Portfolio (optional)", required: false, fields: [{ name: "q2", type: "input_text" }] },
    ];
    const { fields, missingRequired } = mapGreenhouseAnswers(questions, profile);
    expect(fields).toEqual({});
    expect(missingRequired).toEqual(["Why do you want this job?"]);
  });
});
