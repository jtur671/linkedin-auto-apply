import { describe, it, expect } from "vitest";
import { findBestOption } from "@/lib/automation/dropdown-handler";

describe("findBestOption", () => {
  it("finds exact match", () => { expect(findBestOption("8", ["1", "3", "5", "8", "10+"])).toBe("8"); });
  it("case-insensitive", () => { expect(findBestOption("yes", ["Yes", "No"])).toBe("Yes"); });
  it("contains match", () => { expect(findBestOption("Senior", ["Entry level (0-2 years)", "Mid level (3-5 years)", "Senior level (6+ years)"])).toBe("Senior level (6+ years)"); });
  it("numeric range", () => { expect(findBestOption("8", ["1-3", "4-6", "7-9", "10+"])).toBe("7-9"); });
  it("null when no match", () => { expect(findBestOption("Playwright", ["Java", "Python", "C++"])).toBeNull(); });
  it("Yes/No", () => { expect(findBestOption("Yes", ["Yes", "No"])).toBe("Yes"); expect(findBestOption("No", ["Yes", "No"])).toBe("No"); });
});
