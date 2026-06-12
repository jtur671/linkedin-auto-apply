export function formatSalary(
  min?: number,
  max?: number,
  predicted?: boolean,
): string | null {
  if (min == null && max == null) return null;
  const fmt = (n: number) => Math.round(n).toLocaleString("en-US");
  const range =
    min != null && max != null
      ? `${fmt(min)}–${fmt(max)}`
      : fmt((min ?? max) as number);
  return predicted ? `${range} (estimated)` : range;
}
