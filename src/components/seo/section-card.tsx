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
  if (score >= 75) return "text-green-400";
  if (score >= 50) return "text-yellow-400";
  return "text-red-400";
}

function getScoreBg(score: number) {
  if (score >= 75) return "bg-green-500/10 border-green-500/30";
  if (score >= 50) return "bg-yellow-500/10 border-yellow-500/30";
  return "bg-red-500/10 border-red-500/30";
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
    <Card className={getScoreBg(section.score)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{sectionLabel}</CardTitle>
          <div className={`text-2xl font-bold tabular-nums ${getScoreColor(section.score)}`}>
            {section.score}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {section.callouts.length > 0 && (
          <div className="space-y-1.5">
            {section.callouts.map((callout, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 text-yellow-400 flex-shrink-0" />
                <span className="text-muted-foreground">{callout}</span>
              </div>
            ))}
          </div>
        )}

        {section.keywordGaps.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <span className="text-xs text-muted-foreground mr-1">Missing:</span>
            {section.keywordGaps.map((keyword) => (
              <span
                key={keyword}
                className="inline-flex items-center rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-400"
              >
                {keyword}
              </span>
            ))}
          </div>
        )}

        {section.score === 100 && section.callouts.length === 0 && (
          <div className="flex items-center gap-2 text-sm text-green-400">
            <CheckCircle className="h-3.5 w-3.5" />
            This section is well optimized
          </div>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={handleRewrite}
          disabled={loading || !originalContent}
          className="w-full"
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
          ) : showRewrite ? (
            <ChevronUp className="h-3.5 w-3.5 mr-2" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 mr-2" />
          )}
          {loading ? "Generating Rewrite..." : showRewrite ? "Hide Rewrite" : "Show Rewrite"}
        </Button>

        {showRewrite && rewrite && (
          <div className="space-y-3 pt-2 border-t border-border/50">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Original</p>
              <p className="text-sm bg-muted/30 rounded-md p-3 whitespace-pre-wrap">{rewrite.original}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-green-400 mb-1">Optimized</p>
              <p className="text-sm bg-green-500/5 border border-green-500/20 rounded-md p-3 whitespace-pre-wrap">
                {rewrite.rewritten}
              </p>
            </div>
            {rewrite.keywordsAdded.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                <span className="text-xs text-muted-foreground mr-1">Keywords added:</span>
                {rewrite.keywordsAdded.map((k) => (
                  <span
                    key={k}
                    className="inline-flex items-center rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-400"
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
