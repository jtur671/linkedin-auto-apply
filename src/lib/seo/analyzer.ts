import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";
import type {
  ProfileData,
  AuditResult,
  RewriteResult,
  AIProvider,
} from "@/lib/seo/types";

// ---------------------------------------------------------------------------
// Zod schemas for validating AI responses
// ---------------------------------------------------------------------------

const SectionScoreSchema = z.object({
  section: z.string(),
  score: z.number().min(0).max(100),
  callouts: z.array(z.string()),
  keywordGaps: z.array(z.string()),
});

const AuditResultSchema = z.object({
  overallScore: z.number().min(0).max(100),
  sections: z.array(SectionScoreSchema),
  summary: z.string(),
});

const RewriteResultSchema = z.object({
  section: z.string(),
  original: z.string(),
  rewritten: z.string(),
  keywordsAdded: z.array(z.string()),
});

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export function getAIConfig(): { provider: AIProvider; apiKey: string } {
  const provider = (process.env.AI_PROVIDER ?? "openai") as AIProvider;
  const apiKey = process.env.AI_API_KEY ?? "";
  return { provider, apiKey };
}

// ---------------------------------------------------------------------------
// Internal: route calls to the configured AI provider
// ---------------------------------------------------------------------------

async function callAI(
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  const { provider, apiKey } = getAIConfig();

  if (!apiKey) {
    throw new Error(
      "AI_API_KEY is not configured. Set it in your .env file or via the settings page.",
    );
  }

  if (provider === "openai") {
    const client = new OpenAI({ apiKey });
    const response = await client.responses.create({
      model: "gpt-5.4-nano",
      instructions: systemPrompt,
      input: userPrompt,
    });
    return response.output_text ?? "";
  }

  if (provider === "google") {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
    const result = await model.generateContent(
      `${systemPrompt}\n\n${userPrompt}`,
    );
    const text = result.response.text();
    // Gemini may wrap JSON in markdown fences — strip them.
    return text.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "");
  }

  throw new Error(`Unsupported AI provider: ${provider}`);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseJSON<T>(raw: string, schema: z.ZodType<T>): T {
  const parsed = JSON.parse(raw);
  return schema.parse(parsed);
}

async function callAndParse<T>(
  systemPrompt: string,
  userPrompt: string,
  schema: z.ZodType<T>,
): Promise<T> {
  let raw = await callAI(systemPrompt, userPrompt);
  try {
    return parseJSON(raw, schema);
  } catch {
    // Retry once on parse failure — the AI may have returned malformed JSON.
    raw = await callAI(systemPrompt, userPrompt);
    return parseJSON(raw, schema);
  }
}

// ---------------------------------------------------------------------------
// Test connection
// ---------------------------------------------------------------------------

export async function testConnection(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const response = await callAI(
      "You are a helpful assistant. Always respond in JSON.",
      'Respond with exactly: {"ok":true}',
    );
    JSON.parse(response); // just validate it's parseable
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ---------------------------------------------------------------------------
// Audit a LinkedIn profile
// ---------------------------------------------------------------------------

const AUDIT_SYSTEM_PROMPT = `You are an expert LinkedIn profile SEO analyst. You will receive the FULL TEXT of a LinkedIn profile page (scraped from the DOM) and a list of target keywords. Your job is to audit every section of the profile for SEO effectiveness.

Analyze ALL of these sections (if present in the profile text):
- headline (the tagline under the user's name)
- about (the summary/bio section)
- experience (all job entries with titles, companies, descriptions)
- skills (listed skills)
- education (degrees, schools)
- certifications (licenses & certifications)
- projects (listed projects)
- courses (listed courses)
- organizations (memberships)

Score each section from 0 to 100 based on:
- Keyword density: how well the target keywords are incorporated naturally
- Clarity: how clear and compelling the writing is
- Recruiter appeal: how likely the section is to catch a recruiter's attention
- Completeness: whether the section has enough detail

For each section provide:
- A numeric score (0-100)
- Specific, surgical callouts pointing out concrete issues (e.g., "Headline doesn't mention 'Playwright' despite it being a target keyword", "Experience bullets lack quantifiable metrics")
- A list of target keywords that are missing from that section

Also provide:
- An overall weighted score (0-100)
- A brief executive summary of the profile's SEO strengths and weaknesses, including suggestions for sections that should be added or expanded

Respond ONLY with valid JSON matching this exact schema:
{
  "overallScore": number,
  "sections": [
    {
      "section": string,
      "score": number,
      "callouts": string[],
      "keywordGaps": string[]
    }
  ],
  "summary": string
}`;

function buildAuditUserPrompt(
  profile: ProfileData,
  keywords: string[],
): string {
  return `TARGET KEYWORDS: ${keywords.join(", ")}

FULL LINKEDIN PROFILE TEXT (scraped from the page):
---
${profile.rawProfileText}
---

STRUCTURED FIELDS (extracted separately for reference):
Name: ${profile.name}
Headline: ${profile.headline}
Location: ${profile.location}
Current Company: ${profile.currentCompany}
Education: ${profile.education}
Top Skills: ${profile.topSkills.join(", ")}`;
}

export async function auditProfile(
  profile: ProfileData,
  keywords: string[],
): Promise<AuditResult> {
  return callAndParse(
    AUDIT_SYSTEM_PROMPT,
    buildAuditUserPrompt(profile, keywords),
    AuditResultSchema,
  );
}

// ---------------------------------------------------------------------------
// Rewrite a profile section
// ---------------------------------------------------------------------------

const REWRITE_SYSTEM_PROMPT = `You are an expert LinkedIn copywriter and SEO specialist. You will receive a specific section of a LinkedIn profile, a list of target keywords, and the full profile for context.

Your task is to rewrite the section to:
1. Naturally incorporate as many missing target keywords as possible
2. Maintain the user's authentic voice and tone
3. Improve clarity and recruiter appeal
4. Keep roughly the same length (do not bloat the text)

Respond ONLY with valid JSON matching this exact schema:
{
  "section": string,
  "original": string,
  "rewritten": string,
  "keywordsAdded": string[]
}

The "keywordsAdded" array should list only keywords that were NOT in the original but ARE in your rewritten version.`;

function buildRewriteUserPrompt(
  section: string,
  currentContent: string,
  keywords: string[],
  profileContext: ProfileData,
): string {
  return `SECTION TO REWRITE: ${section}

CURRENT CONTENT:
${currentContent}

TARGET KEYWORDS: ${keywords.join(", ")}

FULL PROFILE CONTEXT:
Name: ${profileContext.name}
Headline: ${profileContext.headline}
Location: ${profileContext.location}
Current Company: ${profileContext.currentCompany}
Education: ${profileContext.education}
Top Skills: ${profileContext.topSkills.join(", ")}
Experience: ${profileContext.experience.map((e) => `${e.title} at ${e.company}`).join("; ")}`;
}

export async function rewriteSection(
  section: string,
  currentContent: string,
  keywords: string[],
  profileContext: ProfileData,
): Promise<RewriteResult> {
  return callAndParse(
    REWRITE_SYSTEM_PROMPT,
    buildRewriteUserPrompt(section, currentContent, keywords, profileContext),
    RewriteResultSchema,
  );
}
