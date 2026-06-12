export function isGreenhouseUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return false;
    // Anchor to the greenhouse.io domain: exact apex or a real subdomain.
    // A plain .includes() would accept hostile hosts like "greenhouse.io.evil.com".
    const host = u.hostname.toLowerCase().replace(/\.$/, "");
    return host === "greenhouse.io" || host.endsWith(".greenhouse.io");
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
