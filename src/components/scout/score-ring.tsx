import { cn } from "@/lib/utils";

// Circular match-score ring. null score → muted dashed "—" (never a fake 0%).
export function ScoreRing({
  score,
  size = 46,
  className,
}: {
  score: number | null | undefined;
  size?: number;
  className?: string;
}) {
  if (score == null) {
    return (
      <div
        title="Not scored yet"
        style={{ width: size, height: size }}
        className={cn(
          "grid shrink-0 place-items-center rounded-full border-2 border-dashed border-border text-sm font-bold text-muted-foreground",
          className,
        )}
      >
        —
      </div>
    );
  }
  const pct = Math.max(0, Math.min(100, Math.round(score)));
  const fill =
    pct >= 75 ? "var(--color-primary)" : pct >= 50 ? "var(--color-chart-4)" : "var(--color-muted-foreground)";
  return (
    <div
      role="img"
      aria-label={`${pct}% match`}
      style={{ width: size, height: size, background: `conic-gradient(${fill} ${pct}%, var(--color-border) 0)` }}
      className={cn("grid shrink-0 place-items-center rounded-full", className)}
    >
      <div
        style={{ width: size - 10, height: size - 10, fontSize: size * 0.3 }}
        className="grid place-items-center rounded-full bg-card font-extrabold tabular-nums text-foreground"
      >
        {pct}
      </div>
    </div>
  );
}
