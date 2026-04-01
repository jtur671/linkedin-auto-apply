export function findBestOption(answer: string, options: string[]): string | null {
  const n = answer.toLowerCase().trim();
  // Exact
  for (const o of options) { if (o.toLowerCase().trim() === n) return o; }
  // Contains
  for (const o of options) { if (o.toLowerCase().includes(n)) return o; }
  for (const o of options) { if (n.includes(o.toLowerCase().trim())) return o; }
  // Numeric range
  const num = parseFloat(n);
  if (!isNaN(num)) {
    for (const o of options) {
      const range = o.match(/(\d+)\s*[-\u2013]\s*(\d+)/);
      if (range && num >= parseFloat(range[1]) && num <= parseFloat(range[2])) return o;
      const plus = o.match(/(\d+)\+/);
      if (plus && num >= parseFloat(plus[1])) return o;
    }
  }
  return null;
}
