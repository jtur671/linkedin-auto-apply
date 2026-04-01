import { describe, it, expect } from "vitest";
import { isJobProcessed } from "@/lib/dedup";

describe("isJobProcessed", () => {
  const ids = new Set(["111", "222", "333"]);
  it("true for processed", () => { expect(isJobProcessed("222", ids)).toBe(true); });
  it("false for new", () => { expect(isJobProcessed("444", ids)).toBe(false); });
  it("false for empty set", () => { expect(isJobProcessed("111", new Set())).toBe(false); });
});
