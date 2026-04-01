export interface ProfileAnswerRecord { fieldLabel: string; fieldType: string; answer: string; }

const LABEL_ALIASES: Record<string, string[]> = {
  "phone number": ["phone", "mobile", "cell", "telephone", "contact number"],
  "years of experience": ["years of experience", "total years", "relevant experience", "how many years"],
  website: ["portfolio", "personal website", "portfolio url", "website url", "your website"],
  "linkedin profile": ["linkedin url", "linkedin profile url"],
  "work authorization": ["authorized to work", "work authorization", "visa sponsorship", "legally authorized", "right to work", "require sponsorship"],
};

function normalizeLabel(label: string): string { return label.toLowerCase().trim(); }

function findCanonicalLabel(inputLabel: string): string | null {
  const normalized = normalizeLabel(inputLabel);
  for (const [canonical, aliases] of Object.entries(LABEL_ALIASES)) {
    if (normalized.includes(canonical)) return canonical;
    for (const alias of aliases) { if (normalized.includes(alias)) return canonical; }
  }
  return null;
}

export function matchField(formLabel: string, formFieldType: string, answers: ProfileAnswerRecord[]): string | null {
  const n = normalizeLabel(formLabel);
  // 1. Exact match
  for (const a of answers) { if (normalizeLabel(a.fieldLabel) === n) return a.answer; }
  // 2. Contains match
  for (const a of answers) { const al = normalizeLabel(a.fieldLabel); if (n.includes(al) || al.includes(n)) return a.answer; }
  // 3. Alias match
  const canonical = findCanonicalLabel(n);
  if (canonical) { for (const a of answers) { if (findCanonicalLabel(a.fieldLabel) === canonical) return a.answer; } }
  return null;
}
