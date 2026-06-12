// tests/unit/ui/outcome-copy.test.ts
import { describe, it, expect } from "vitest";
import { outcomeCopy, activityCopy } from "@/lib/ui/outcome-copy";

describe("outcomeCopy", () => {
  it("maps apply outcomes to Scout copy", () => {
    expect(outcomeCopy("submitted")).toBe("Applied 🎉");
    expect(outcomeCopy("needs_review")).toBe("Your call");
    expect(outcomeCopy("failed")).toBe("Didn't go through");
    expect(outcomeCopy("skipped")).toBe("Passed");
  });
  it("falls back gracefully", () => {
    expect(outcomeCopy(null)).toBe("Found");
    expect(outcomeCopy(undefined)).toBe("Found");
    expect(outcomeCopy("weird_state")).toBe("Weird state");
  });
});

describe("activityCopy", () => {
  it("maps known log actions to sentences", () => {
    expect(activityCopy("indeed_start")).toBe("🔎 Started looking for jobs");
    expect(activityCopy("indeed_stop")).toBe("✅ Finished a search sweep");
    expect(activityCopy("indeed_error")).toBe("⚠️ Hit a snag while searching");
    expect(activityCopy("apply_success", { company: "Figma" })).toBe("🎉 Applied to Figma");
  });
  it("humanizes unknown actions", () => {
    expect(activityCopy("session_refresh")).toBe("Session refresh");
  });

  // Extra assertions for every real action discovered via grep
  it("maps automation lifecycle actions", () => {
    expect(activityCopy("automation_start")).toBe("🚀 Scout started running");
    expect(activityCopy("automation_stop")).toBe("🛑 Scout stopped");
  });
  it("maps login flow actions", () => {
    expect(activityCopy("login_success")).toBe("🔓 Signed in successfully");
    expect(activityCopy("login_fail")).toBe("🔒 Sign-in didn't work");
    expect(activityCopy("login_cookie_reuse")).toBe("🍪 Resumed a saved session");
  });
  it("maps apply flow actions", () => {
    expect(activityCopy("apply_skip", { company: "Acme" })).toBe("⏭️ Skipped Acme");
    expect(activityCopy("apply_skip")).toBe("⏭️ Skipped a job");
    expect(activityCopy("apply_error", { company: "Notion" })).toBe("❌ Couldn't apply to Notion");
    expect(activityCopy("apply_error")).toBe("❌ Couldn't apply to that one");
  });
  it("maps search phase actions", () => {
    expect(activityCopy("search_start")).toBe("🔍 Starting a search");
    expect(activityCopy("search_results", { count: 12 })).toBe("📋 Found 12 jobs");
    expect(activityCopy("search_results")).toBe("📋 Found some jobs");
    expect(activityCopy("search_debug")).toBe("🐛 Search debug info");
  });
  it("maps rate-limit and captcha actions", () => {
    expect(activityCopy("rate_limited")).toBe("🐢 Slowing down — hit a rate limit");
    expect(activityCopy("captcha_detected")).toBe("🤖 Ran into a captcha — pausing");
  });
});
