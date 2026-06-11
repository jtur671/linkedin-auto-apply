import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";
import type { AIProvider } from "@/lib/seo/types";

export function getAIConfig(): { provider: AIProvider; apiKey: string } {
  const provider = (process.env.AI_PROVIDER ?? "openai") as AIProvider;
  const apiKey = process.env.AI_API_KEY ?? "";
  return { provider, apiKey };
}

export async function callAI(
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
    return text.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "");
  }

  throw new Error(`Unsupported AI provider: ${provider}`);
}

function parseJSON<T>(raw: string, schema: z.ZodType<T>): T {
  const parsed = JSON.parse(raw);
  return schema.parse(parsed);
}

export async function callAndParse<T>(
  systemPrompt: string,
  userPrompt: string,
  schema: z.ZodType<T>,
): Promise<T> {
  let raw = await callAI(systemPrompt, userPrompt);
  try {
    return parseJSON(raw, schema);
  } catch {
    // Retry once on parse failure
    raw = await callAI(systemPrompt, userPrompt);
    return parseJSON(raw, schema);
  }
}

export async function testConnection(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const response = await callAI(
      "You are a helpful assistant. Always respond in JSON.",
      'Respond with exactly: {"ok":true}',
    );
    JSON.parse(response);
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
