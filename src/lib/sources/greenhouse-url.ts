export function isGreenhouseUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    return new URL(url).hostname.includes("greenhouse.io");
  } catch {
    return false;
  }
}

export function parseGreenhouseUrl(
  url: string | null | undefined,
): { token: string; jobId: string } | null {
  if (!isGreenhouseUrl(url)) return null;
  // path forms: /{token}/jobs/{id}
  const m = new URL(url as string).pathname.match(/\/([^/]+)\/jobs\/(\d+)/);
  return m ? { token: m[1], jobId: m[2] } : null;
}
