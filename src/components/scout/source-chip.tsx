"use client";

import { cn } from "@/lib/utils";

// Per-source soft tints + labels. Each source gets a distinct, gentle hue so a
// glance tells you where a pick came from. Keep these low-saturation so they
// read as friendly tags, not warning labels.
const SOURCE_STYLES: Record<string, { label: string; className: string }> = {
  adzuna: {
    label: "Adzuna",
    className:
      "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300",
  },
  remotive: {
    label: "Remotive",
    className:
      "bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300",
  },
  remoteok: {
    label: "RemoteOK",
    className:
      "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
  },
  himalayas: {
    label: "Himalayas",
    className:
      "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300",
  },
  usajobs: {
    label: "USAJOBS",
    className:
      "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
  },
  hiringcafe: {
    label: "Hiring Cafe",
    className:
      "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  },
  linkedin: {
    label: "LinkedIn",
    className:
      "bg-cyan-100 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300",
  },
};

const FALLBACK = {
  className:
    "bg-muted text-muted-foreground",
};

function prettify(id: string): string {
  return id.charAt(0).toUpperCase() + id.slice(1);
}

export function SourceChip({ source }: { source: string }) {
  const key = source?.toLowerCase() ?? "";
  const style = SOURCE_STYLES[key];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold leading-tight",
        style?.className ?? FALLBACK.className,
      )}
    >
      {style?.label ?? prettify(source)}
    </span>
  );
}
