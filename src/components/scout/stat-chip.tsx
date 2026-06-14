"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// A single at-a-glance number. Stats float on the wash like everything else in
// Scout — a soft card, big tabular figure, plain-English label underneath.
export function StatChip({
  label,
  value,
  icon,
  className,
}: {
  label: string;
  value: number | string | null;
  icon?: ReactNode;
  className?: string;
}) {
  const display = value === null ? "—" : value;
  return (
    <div
      className={cn(
        "rounded-2xl border border-border/60 bg-card p-3.5 shadow-scout",
        className,
      )}
    >
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <span className="text-xs font-semibold leading-tight">{label}</span>
      </div>
      <div className="mt-1 text-2xl font-extrabold tabular-nums text-foreground">
        {display}
      </div>
    </div>
  );
}
