"use client";

import { useEffect, useState } from "react";
import { KeywordInput } from "@/components/seo/keyword-input";
import { AuditReport } from "@/components/seo/audit-report";
import { AuditProgress } from "@/components/seo/audit-progress";
import type { AuditResult, ProfileData } from "@/lib/seo/types";

export default function SeoPage() {
  const [loading, setLoading] = useState(false);
  const [defaultKeywords, setDefaultKeywords] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((d) => {
        const configs: Array<{ keywords: string; isActive: boolean }> = d.configs ?? [];
        const kws = configs
          .filter((c) => c.isActive)
          .map((c) => c.keywords)
          .filter(Boolean);
        if (kws.length > 0) setDefaultKeywords(kws);
      })
      .catch(() => {});
  }, []);
  const [audit, setAudit] = useState<AuditResult | null>(null);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function handleAudit(selectedKeywords: string[]) {
    setLoading(true);
    setError(null);
    setKeywords(selectedKeywords);
    try {
      const res = await fetch("/api/seo/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keywords: selectedKeywords }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Audit failed");
      }
      const data = await res.json();
      setProfileData(data.profileData);
      setAudit(data.audit);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">Profile SEO</h2>
      <KeywordInput onAudit={handleAudit} loading={loading} defaultKeywords={defaultKeywords} />

      {loading && <AuditProgress />}

      {error && (
        <div className="rounded-md bg-red-500/10 border border-red-500/30 p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {audit && profileData && !loading && (
        <AuditReport audit={audit} profileData={profileData} keywords={keywords} />
      )}
    </div>
  );
}
