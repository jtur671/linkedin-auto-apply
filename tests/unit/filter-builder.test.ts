import { describe, it, expect } from "vitest";
import { buildSearchUrl, SearchParams } from "@/lib/filter-builder";

describe("buildSearchUrl", () => {
  it("builds basic URL with keywords", () => {
    const url = buildSearchUrl({ keywords: "QA Engineer" });
    expect(url).toContain("linkedin.com/jobs/search");
    expect(url).toContain("keywords=QA+Engineer");
    expect(url).toContain("f_AL=true");
  });
  it("includes location", () => {
    expect(buildSearchUrl({ keywords: "SDET", location: "New York" })).toContain("location=New+York");
  });
  it("maps remote preference", () => {
    expect(buildSearchUrl({ keywords: "QA", remotePreference: "remote" })).toContain("f_WT=2");
    expect(buildSearchUrl({ keywords: "QA", remotePreference: "hybrid" })).toContain("f_WT=3");
    expect(buildSearchUrl({ keywords: "QA", remotePreference: "onsite" })).toContain("f_WT=1");
  });
  it("no f_WT for any", () => {
    expect(buildSearchUrl({ keywords: "QA", remotePreference: "any" })).not.toContain("f_WT");
  });
  it("maps datePosted", () => {
    expect(buildSearchUrl({ keywords: "QA", datePosted: "past_24_hours" })).toContain("f_TPR=r86400");
    expect(buildSearchUrl({ keywords: "QA", datePosted: "past_week" })).toContain("f_TPR=r604800");
    expect(buildSearchUrl({ keywords: "QA", datePosted: "past_month" })).toContain("f_TPR=r2592000");
  });
  it("maps experienceLevel", () => {
    expect(buildSearchUrl({ keywords: "QA", experienceLevel: "entry" })).toContain("f_E=2");
    expect(buildSearchUrl({ keywords: "QA", experienceLevel: "mid" })).toContain("f_E=3");
    expect(buildSearchUrl({ keywords: "QA", experienceLevel: "senior" })).toContain("f_E=4");
  });
  it("includes page offset", () => {
    expect(buildSearchUrl({ keywords: "QA" }, 2)).toContain("start=50");
  });
});
