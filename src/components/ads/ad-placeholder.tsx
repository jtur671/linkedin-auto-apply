"use client";

import { AD_SIZES, AdSize } from "./constants";

export function AdPlaceholder({ size }: { size: AdSize }) {
  const dims = AD_SIZES[size];
  return (
    <div
      className="flex items-center justify-center rounded-xl border border-dashed border-foreground/10 bg-muted/20 text-xs text-muted-foreground mx-auto"
      style={{ maxWidth: dims.width, height: dims.height }}
      aria-hidden="true"
      role="complementary"
    >
      <span className="opacity-50">Sponsored</span>
    </div>
  );
}
