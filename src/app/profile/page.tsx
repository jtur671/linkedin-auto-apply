"use client";

import { useEffect, useState } from "react";
import { KeywordInput } from "@/components/seo/keyword-input";
import { AuditReport } from "@/components/seo/audit-report";
import { AuditProgress } from "@/components/seo/audit-progress";
import type { AuditResult, ProfileData } from "@/lib/seo/types";
import { UserCircle2 } from "lucide-react";

export default function ProfilePage() {
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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 animate-[feedEntryIn_0.35s_ease-out]">
      {/* Page header */}
      <div className="flex items-start gap-3">
        <div className="rounded-2xl bg-primary/10 p-2.5 shadow-scout">
          <UserCircle2 className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Profile</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Make recruiters find you</p>
        </div>
      </div>

      {/* Keyword input — Scout-framed */}
      <KeywordInput
        onAudit={handleAudit}
        loading={loading}
        defaultKeywords={defaultKeywords}
      />

      {/* Progress */}
      {loading && <AuditProgress />}

      {/* Error */}
      {error && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive shadow-scout">
          {error}
        </div>
      )}

      {/* Results */}
      {audit && profileData && !loading && (
        <AuditReport audit={audit} profileData={profileData} keywords={keywords} />
      )}
    </div>
  );
}
