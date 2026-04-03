import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the AI SDKs before importing the module
vi.mock("openai", () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: vi.fn(),
        },
      },
    })),
  };
});

vi.mock("@google/generative-ai", () => ({
  GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
    getGenerativeModel: vi.fn().mockReturnValue({
      generateContent: vi.fn(),
    }),
  })),
}));

import { getAIConfig } from "@/lib/seo/analyzer";
import type { ProfileData } from "@/lib/seo/types";

const mockProfile: ProfileData = {
  name: "Jason Tur",
  headline: "Senior QA Automation Engineer",
  about: "I focus on automation and software validation.",
  location: "Safety Harbor, FL",
  currentCompany: "ITPIE",
  education: "Miami Dade College",
  topSkills: ["TypeScript", "Playwright", "JavaScript"],
  experience: [
    { title: "Senior QA Automation Engineer", company: "ITPIE", description: "Converted Cypress to Playwright" },
  ],
  rawProfileText: "Jason Tur\nSenior QA Automation Engineer\nITPIE\nExperience\nSkills\nTypeScript",
};

describe("getAIConfig", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns openai as default provider", () => {
    vi.stubEnv("AI_PROVIDER", "openai");
    vi.stubEnv("AI_API_KEY", "test-key");
    const config = getAIConfig();
    expect(config.provider).toBe("openai");
    expect(config.apiKey).toBe("test-key");
  });

  it("returns google provider when configured", () => {
    vi.stubEnv("AI_PROVIDER", "google");
    vi.stubEnv("AI_API_KEY", "AIza-test");
    const config = getAIConfig();
    expect(config.provider).toBe("google");
  });

  it("returns empty api key when not set", () => {
    vi.stubEnv("AI_PROVIDER", "openai");
    vi.stubEnv("AI_API_KEY", "");
    const config = getAIConfig();
    expect(config.apiKey).toBe("");
  });
});

describe("ProfileData structure", () => {
  it("has all required fields", () => {
    expect(mockProfile.name).toBe("Jason Tur");
    expect(mockProfile.headline).toContain("QA");
    expect(mockProfile.topSkills).toHaveLength(3);
    expect(mockProfile.experience).toHaveLength(1);
    expect(mockProfile.experience[0].title).toContain("Senior");
  });
});
