export interface ProfileData {
  name: string;
  headline: string;
  about: string;
  location: string;
  currentCompany: string;
  education: string;
  topSkills: string[];
  experience: Array<{ title: string; company: string; description: string }>;
  rawProfileText: string;
}

export interface SectionScore {
  section: string;
  score: number;
  callouts: string[];
  keywordGaps: string[];
}

export interface AuditResult {
  overallScore: number;
  sections: SectionScore[];
  summary: string;
}

export interface RewriteResult {
  section: string;
  original: string;
  rewritten: string;
  keywordsAdded: string[];
}

export type AIProvider = "openai" | "google";
