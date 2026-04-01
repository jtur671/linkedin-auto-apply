export interface ParsedJob { linkedinJobId: string; title: string; company: string; location: string; url: string; }

export function parseJobIdFromUrl(url: string): string | null {
  const match = url.match(/\/jobs\/view\/(\d+)/);
  return match ? match[1] : null;
}

export function parseJobData(raw: { title: string; company: string; location: string; url: string }): ParsedJob | null {
  const title = raw.title?.trim(), company = raw.company?.trim(), location = raw.location?.trim(), url = raw.url?.trim();
  if (!title || !company || !location || !url) return null;
  const linkedinJobId = parseJobIdFromUrl(url);
  if (!linkedinJobId) return null;
  return { linkedinJobId, title, company, location, url };
}
