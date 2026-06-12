import type { JobApplier, JobSource, NormalizedJob } from "./types";
import { adzunaSource } from "./adzuna-source";
import { remotiveSource } from "./remotive-source";
import { remoteOkSource } from "./remoteok-source";
import { himalayasSource } from "./himalayas-source";
import { usajobsSource } from "./usajobs-source";
import { greenhouseApplier } from "./greenhouse";
import { leverApplier } from "./lever";
import { ashbyApplier } from "./ashby";

const SOURCES: JobSource[] = [
  adzunaSource,
  remotiveSource,
  remoteOkSource,
  himalayasSource,
  usajobsSource,
];
const APPLIERS: JobApplier[] = [greenhouseApplier, leverApplier, ashbyApplier];

// Return copies so callers can't mutate the registry's module-level state.
export function registeredSources(): JobSource[] {
  return [...SOURCES];
}
export function registeredAppliers(): JobApplier[] {
  return [...APPLIERS];
}
export function applierFor(
  job: NormalizedJob,
  appliers: JobApplier[] = APPLIERS,
): JobApplier | null {
  return appliers.find((a) => a.canApply(job)) ?? null;
}
