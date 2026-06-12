import { describe, it, expect } from "vitest";
import { registeredSources, registeredAppliers } from "@/lib/sources/registry";
import type { NormalizedJob } from "@/lib/sources/types";

const sampleJob: NormalizedJob = {
  source: "x", externalId: "1", title: "t", company: "c", location: "l",
  salary: null, jobType: null, url: "https://example.com/jobs/1", applyUrl: null, description: "",
};

describe.each(registeredSources())("JobSource conformance: $id", (source) => {
  it("has a non-empty id and label", () => {
    expect(source.id).toBeTruthy();
    expect(source.label).toBeTruthy();
  });
  it("exposes isConfigured() and search()", () => {
    expect(typeof source.isConfigured).toBe("function");
    expect(typeof source.search).toBe("function");
  });
});

describe.each(registeredAppliers())("JobApplier conformance: $id", (applier) => {
  it("has a non-empty id", () => {
    expect(applier.id).toBeTruthy();
  });
  it("canApply is pure & deterministic", () => {
    const a = applier.canApply(sampleJob);
    const b = applier.canApply(sampleJob);
    expect(a).toBe(b);
    expect(typeof a).toBe("boolean");
  });
});
