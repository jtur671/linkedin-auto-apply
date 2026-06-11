import { z } from "zod";
import { callAndParse } from "@/lib/ai/client";

export interface ParsedRequirement {
  category: string;
  requirement: string;
  isRequired: boolean;
}

// ---------------------------------------------------------------------------
// Section detection
// ---------------------------------------------------------------------------

const REQUIRED_HEADERS =
  /^(requirements?|qualifications?|what you.?ll need|must have|minimum qualifications?|essential|key skills|skills? required|required skills?)/im;

const PREFERRED_HEADERS =
  /^(nice to have|preferred|bonus|desired|plus|additional|optional)/im;

// ---------------------------------------------------------------------------
// Category detection patterns
// ---------------------------------------------------------------------------

const EDUCATION_PATTERN =
  /\b(degree|bachelor|master|phd|doctorate|diploma|associate|mba|gpa|university|college|b\.?s\.?|m\.?s\.?|b\.?a\.?|m\.?a\.?)\b/i;

const EXPERIENCE_PATTERN =
  /\b(\d+)\+?\s*(years?|yrs?)\s*(of\s*)?(experience|working|background|in\s)/i;

const CERTIFICATION_PATTERN =
  /\b(certif|license[d]?|pmp|aws certified|cpa|cfa|ccna|ccnp|cissp|comptia|scrum master|six sigma|itil)\b/i;

const SOFT_SKILL_PATTERN =
  /\b(communicat|leadership|team\s?work|collaborat|problem.?solv|detail.?orient|interpersonal|organizational|self.?motivat|time management|critical thinking|creative|adaptab|mentor|presentation)\b/i;

const TECHNICAL_INDICATORS =
  /\b(proficien|expertise in|knowledge of|experience with|familiar with|hands.?on|working knowledge|strong understanding|fluent in)\b/i;

// ---------------------------------------------------------------------------
// HTML normalization
// ---------------------------------------------------------------------------

function normalizeHtml(html: string): string {
  let text = html;
  // Convert list items to bullets
  text = text.replace(/<li[^>]*>/gi, "\n- ");
  text = text.replace(/<\/li>/gi, "");
  // Convert headers to section markers
  text = text.replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, "\n## $1\n");
  // Convert strong/b to markers for emphasis
  text = text.replace(/<(?:strong|b)[^>]*>(.*?)<\/(?:strong|b)>/gi, "$1");
  // Convert br and p to newlines
  text = text.replace(/<br\s*\/?>/gi, "\n");
  text = text.replace(/<\/p>/gi, "\n");
  text = text.replace(/<p[^>]*>/gi, "");
  // Strip remaining tags
  text = text.replace(/<[^>]+>/g, "");
  // Decode HTML entities
  text = text.replace(/&amp;/g, "&");
  text = text.replace(/&lt;/g, "<");
  text = text.replace(/&gt;/g, ">");
  text = text.replace(/&nbsp;/g, " ");
  text = text.replace(/&#\d+;/g, "");
  // Collapse whitespace but preserve newlines
  text = text.replace(/[ \t]+/g, " ");
  text = text.replace(/\n{3,}/g, "\n\n");
  return text.trim();
}

// ---------------------------------------------------------------------------
// Bullet extraction
// ---------------------------------------------------------------------------

function extractBullets(text: string): string[] {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const bullets: string[] = [];

  for (const line of lines) {
    // Lines starting with bullet chars or numbers
    const cleaned = line
      .replace(/^[-*•◦▪▸►]\s*/, "")
      .replace(/^\d+[.)]\s*/, "")
      .trim();

    // Skip very short lines (headers, labels) and very long ones (paragraphs)
    if (cleaned.length < 10 || cleaned.length > 500) continue;
    // Skip lines that are likely headers
    if (cleaned.match(/^(about|who we are|what we do|company|overview|description)/i)) continue;

    bullets.push(cleaned);
  }

  return bullets;
}

// ---------------------------------------------------------------------------
// Categorization
// ---------------------------------------------------------------------------

function categorize(text: string): string {
  if (EDUCATION_PATTERN.test(text)) return "education";
  if (EXPERIENCE_PATTERN.test(text)) return "experience";
  if (CERTIFICATION_PATTERN.test(text)) return "certification";
  if (SOFT_SKILL_PATTERN.test(text)) return "soft_skill";
  if (TECHNICAL_INDICATORS.test(text)) return "technical_skill";
  return "other";
}

// ---------------------------------------------------------------------------
// Rule-based extraction
// ---------------------------------------------------------------------------

export function parseRequirementsRuleBased(
  descriptionHtml: string,
): ParsedRequirement[] {
  const text = normalizeHtml(descriptionHtml);
  const results: ParsedRequirement[] = [];
  const seen = new Set<string>();

  // Split into sections
  const sections = text.split(/\n(?=##\s|[A-Z][a-z]+(?:\s[A-Z][a-z]+)*:\s*\n)/);

  for (const section of sections) {
    const isPreferred = PREFERRED_HEADERS.test(section);
    const isRequired = REQUIRED_HEADERS.test(section) || !isPreferred;

    const bullets = extractBullets(section);

    for (const bullet of bullets) {
      const normalized = bullet.toLowerCase().trim();
      if (seen.has(normalized)) continue;
      seen.add(normalized);

      results.push({
        category: categorize(bullet),
        requirement: bullet,
        isRequired: isRequired && !isPreferred,
      });
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// AI-powered extraction (fallback)
// ---------------------------------------------------------------------------

const RequirementSchema = z.object({
  category: z.enum([
    "technical_skill",
    "soft_skill",
    "education",
    "experience",
    "certification",
    "other",
  ]),
  requirement: z.string(),
  isRequired: z.boolean(),
});

const RequirementsArraySchema = z.array(RequirementSchema);

const AI_SYSTEM_PROMPT = `You are a job requirements extraction expert. Given a job description, extract ALL requirements and qualifications as a structured list.

For each requirement:
- category: one of "technical_skill", "soft_skill", "education", "experience", "certification", "other"
- requirement: a concise description of the requirement (one sentence)
- isRequired: true if it's a mandatory requirement, false if it's preferred/nice-to-have

Respond ONLY with a valid JSON array. Example:
[
  {"category": "technical_skill", "requirement": "Proficiency in Python and SQL", "isRequired": true},
  {"category": "experience", "requirement": "5+ years of software engineering experience", "isRequired": true},
  {"category": "education", "requirement": "Bachelor's degree in Computer Science or related field", "isRequired": false}
]`;

export async function parseRequirementsAI(
  descriptionText: string,
): Promise<ParsedRequirement[]> {
  const userPrompt = `Extract all requirements from this job description:\n\n${descriptionText.slice(0, 4000)}`;

  return callAndParse(AI_SYSTEM_PROMPT, userPrompt, RequirementsArraySchema);
}

// ---------------------------------------------------------------------------
// Combined extraction (rule-based first, AI fallback)
// ---------------------------------------------------------------------------

export async function parseRequirements(
  descriptionHtml: string,
  descriptionText: string,
): Promise<ParsedRequirement[]> {
  // Try rule-based first
  const ruleBased = parseRequirementsRuleBased(descriptionHtml);

  // If we got enough results, use them
  if (ruleBased.length >= 3) {
    return ruleBased;
  }

  // Fall back to AI
  try {
    const aiResults = await parseRequirementsAI(descriptionText);
    return aiResults;
  } catch {
    // If AI also fails, return whatever rule-based found
    return ruleBased;
  }
}
