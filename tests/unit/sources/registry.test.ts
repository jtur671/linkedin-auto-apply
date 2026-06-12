import { describe, it, expect } from "vitest";
import { registeredSources, registeredAppliers, applierFor } from "@/lib/sources/registry";
import type { NormalizedJob } from "@/lib/sources/types";

const job = (url: string): NormalizedJob => ({
  source: "adzuna", externalId: "1", title: "QA", company: "Acme", location: "Remote",
  salary: null, jobType: null, url, applyUrl: url, description: "",
});

describe("registry", () => {
  it("registers adzuna as a source and greenhouse as an applier", () => {
    expect(registeredSources().map((s) => s.id)).toContain("adzuna");
    expect(registeredAppliers().map((a) => a.id)).toContain("greenhouse");
  });

  it("routes greenhouse jobs to the greenhouse applier", () => {
    expect(applierFor(job("https://boards.greenhouse.io/acme/jobs/1"))?.id).toBe("greenhouse");
  });

  it("returns null when no applier matches", () => {
    expect(applierFor(job("https://www.linkedin.com/jobs/view/1"))).toBeNull();
  });
});
