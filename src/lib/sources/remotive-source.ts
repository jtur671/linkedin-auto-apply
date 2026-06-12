import type { JobSource, JobSearchCriteria, NormalizedJob } from "./types";

interface RemotiveJob {
  id: number;
  url: string;
  title?: string;
  company_name?: string;
  candidate_required_location?: string;
  salary?: string;
  job_type?: string;
  description: string;
  [key: string]: unknown;
}

interface RemotiveResponse {
  jobs: RemotiveJob[];
}

async function searchRemotive(criteria: JobSearchCriteria): Promise<NormalizedJob[]> {
  const params = new URLSearchParams({
    search: criteria.query,
    limit: String(criteria.limit ?? 50),
  });

  const url = `https://remotive.com/api/remote-jobs?${params.toString()}`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Remotive API error: ${res.status}`);
  }

  const data: RemotiveResponse = await res.json();

  return data.jobs.map((job): NormalizedJob => {
    const salary = job.salary?.trim() || null;

    return {
      source: "remotive",
      externalId: String(job.id),
      title: job.title?.trim() || "Untitled",
      company: job.company_name?.trim() || "Unknown",
      location: job.candidate_required_location ?? "",
      salary,
      jobType: job.job_type ?? null,
      url: job.url ?? "",
      applyUrl: job.url || null,
      description: job.description,
    };
  });
}

export const remotiveSource: JobSource = {
  id: "remotive",
  label: "Remotive",
  isConfigured() {
    return true; // No auth required
  },
  async search(criteria: JobSearchCriteria): Promise<NormalizedJob[]> {
    return searchRemotive(criteria);
  },
};
