import type { JobSource, JobSearchCriteria, NormalizedJob } from "./types";
import { searchAdzuna, getAdzunaConfig } from "@/lib/jobs/adzuna";

export const adzunaSource: JobSource = {
  id: "adzuna",
  label: "Adzuna",
  isConfigured() {
    const c = getAdzunaConfig();
    return Boolean(c.appId && c.appKey);
  },
  async search(criteria: JobSearchCriteria): Promise<NormalizedJob[]> {
    return searchAdzuna({
      what: criteria.query,
      where: criteria.location,
      resultsPerPage: criteria.limit ?? 50,
      maxDaysOld: criteria.maxDaysOld,
    });
  },
};
