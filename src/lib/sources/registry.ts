import type { JobApplier, JobSource, NormalizedJob } from "./types";
import { adzunaSource } from "./adzuna-source";
import { greenhouseApplier } from "./greenhouse";

const SOURCES: JobSource[] = [adzunaSource];
const APPLIERS: JobApplier[] = [greenhouseApplier];

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
