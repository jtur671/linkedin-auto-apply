export function isLocalhost(): boolean {
  if (typeof window === "undefined") return true;
  return ["localhost", "127.0.0.1", "0.0.0.0"].includes(window.location.hostname);
}

export function getAdProvider(): "adsense" | "self-hosted" {
  if (isLocalhost()) return "self-hosted";
  return (process.env.NEXT_PUBLIC_AD_PROVIDER as "adsense" | "self-hosted") ?? "self-hosted";
}

export function isAdsEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_ADS_ENABLED === "false") return false;
  return true;
}
