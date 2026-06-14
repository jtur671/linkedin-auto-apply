"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ChevronDown, ChevronUp, AlertTriangle, CheckCircle } from "lucide-react";
import type { SectionScore, ProfileData, RewriteResult } from "@/lib/seo/types";

interface SectionCardProps {
  section: SectionScore;
  originalContent: string;
  keywords: string[];
  profileData: ProfileData;
}

function getScoreColor(score: number) {
  if (score >= 75) return "text-primary";
  if (score >= 50) return "text-amber-500";
  return "text-destructive";
}

function getScoreBg(score: number) {
  if (score >= 75) return "border-primary/20 bg-primary/5";
  if (score >= 50) return "border-amber-400/25 bg-amber-50/60 dark:bg-amber-950/20";
  return "border-destructive/25 bg-destructive/5";
}

function getScoreFriendlyLabel(score: number) {
  if (score >= 85) return "Solid";
  if (score >= 70) return "Good";
  if (score >= 50) return "Needs work";
  return "Needs attention";
}

export function SectionCard({ section, originalContent, keywords, profileData }: SectionCardProps) {
  const [rewrite, setRewrite] = useState<RewriteResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [showRewrite, setShowRewrite] = useState(false);

  async function handleRewrite() {
    if (rewrite) {
      setShowRewrite(!showRewrite);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/seo/rewrite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section: section.section,
          currentContent: originalContent,
          keywords,
          profileData,
        }),
      });
      const data = await res.json();
      setRewrite(data);
      setShowRewrite(true);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  const sectionLabel = section.section.charAt(0).toUpperCase() + section.section.slice(1);

  return (
    <Card className={`rounded-2xl shadow-scout border ${getScoreBg(section.score)}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-bold">{sectionLabel}</CardTitle>
          <div className="flex flex-col items-end">
            <span className={`text-2xl font-extrabold tabular-nums leading-none ${getScoreColor(section.score)}`}>
              {section.score}
            </span>
            <span className={`text-[10px] font-semibold uppercase tracking-wide ${getScoreColor(section.score)} opacity-70`}>
              {getScoreFriendlyLabel(section.score)}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {section.callouts.length > 0 && (
          <div className="space-y-1.5">
            {section.callouts.map((callout, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-amber-500" />
                <span className="text-muted-foreground">{callout}</span>
              </div>
            ))}
          </div>
        )}

        {section.keywordGaps.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <span className="mr-1 text-xs text-muted-foreground">Missing:</span>
            {section.keywordGaps.map((keyword) => (
              <span
                key={keyword}
                className="inline-flex items-center rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive"
              >
                {keyword}
              </span>
            ))}
          </div>
        )}

        {section.score === 100 && section.callouts.length === 0 && (
          <div className="flex items-center gap-2 text-sm font-semibold text-primary">
            <CheckCircle className="h-3.5 w-3.5" />
            This section looks great!
          </div>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={handleRewrite}
          disabled={loading || !originalContent}
          className="w-full rounded-xl border-primary/30 text-primary hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-ring font-semibold"
        >
          {loading ? (
            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
          ) : showRewrite ? (
            <ChevronUp className="mr-2 h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="mr-2 h-3.5 w-3.5" />
          )}
          {loading ? "Writing a better version…" : showRewrite ? "Hide suggestion" : "Suggest an improvement"}
        </Button>

        {showRewrite && rewrite && (
          <div className="space-y-3 border-t border-border/50 pt-3">
            <div>
              <p className="mb-1 text-xs font-semibold text-muted-foreground">Before</p>
              <p className="rounded-xl bg-muted/40 p-3 text-sm whitespace-pre-wrap">{rewrite.original}</p>
            </div>
            <div>
              <p className="mb-1 text-xs font-semibold text-primary">After</p>
              <p className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm whitespace-pre-wrap">
                {rewrite.rewritten}
              </p>
            </div>
            {rewrite.keywordsAdded.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                <span className="mr-1 text-xs text-muted-foreground">Keywords added:</span>
                {rewrite.keywordsAdded.map((k) => (
                  <span
                    key={k}
                    className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary"
                  >
                    {k}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
