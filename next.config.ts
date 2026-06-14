import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // Legacy routes → Scout IA. Temporary (307) — these were never public URLs.
      { source: "/indeed", destination: "/jobs?tab=found", permanent: false },
      { source: "/indeed/insights", destination: "/jobs", permanent: false },
      { source: "/indeed/:id(\\d+)", destination: "/jobs/:id", permanent: false },
      { source: "/seo", destination: "/profile", permanent: false },
      { source: "/config", destination: "/settings", permanent: false },
      { source: "/review", destination: "/?focus=queue", permanent: false },
      { source: "/logs", destination: "/settings/logs", permanent: false },
    ];
  },
};

export default nextConfig;
