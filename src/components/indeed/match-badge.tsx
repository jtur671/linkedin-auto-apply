"use client";
import { Badge } from "@/components/ui/badge";

export function MatchBadge({ score }: { score: number | null }) {
  if (score === null || score === undefined) {
    return (
      <Badge variant="outline" className="text-muted-foreground">
        --
      </Badge>
    );
  }

  if (score >= 80) {
    return (
      <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/20 dark:text-emerald-400">
        {score}%
      </Badge>
    );
  }

  if (score >= 50) {
    return (
      <Badge className="bg-amber-500/15 text-amber-700 border-amber-500/20 dark:text-amber-400">
        {score}%
      </Badge>
    );
  }

  return (
    <Badge variant="destructive">
      {score}%
    </Badge>
  );
}
