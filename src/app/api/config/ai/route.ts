import { NextResponse } from "next/server";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { getAIConfig, testConnection } from "@/lib/seo/analyzer";

const ENV_PATH = process.cwd() + "/.env";

export async function GET() {
  const { provider, apiKey } = getAIConfig();
  return NextResponse.json({
    provider,
    hasKey: apiKey.length > 0,
  });
}

export async function POST(req: Request) {
  const body = await req.json();
  const { provider, apiKey, test } = body as {
    provider?: string;
    apiKey?: string;
    test?: boolean;
  };

  if (!provider || !apiKey) {
    return NextResponse.json(
      { error: "provider and apiKey are required" },
      { status: 400 },
    );
  }

  if (provider !== "openai" && provider !== "google") {
    return NextResponse.json(
      { error: "provider must be 'openai' or 'google'" },
      { status: 400 },
    );
  }

  // --- Update .env file on disk ---
  let envContent = "";
  if (existsSync(ENV_PATH)) {
    envContent = readFileSync(ENV_PATH, "utf-8");
  }

  envContent = upsertEnvVar(envContent, "AI_PROVIDER", provider);
  envContent = upsertEnvVar(envContent, "AI_API_KEY", apiKey);
  writeFileSync(ENV_PATH, envContent, "utf-8");

  // --- Update process.env in-memory ---
  process.env.AI_PROVIDER = provider;
  process.env.AI_API_KEY = apiKey;

  // --- Optionally test the connection ---
  if (test) {
    const result = await testConnection();
    return NextResponse.json({
      provider,
      hasKey: true,
      test: result,
    });
  }

  return NextResponse.json({ provider, hasKey: true });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function upsertEnvVar(content: string, key: string, value: string): string {
  const regex = new RegExp(`^${key}=.*$`, "m");
  const line = `${key}=${value}`;

  if (regex.test(content)) {
    return content.replace(regex, line);
  }

  // Append with a newline separator if the file doesn't end with one
  const separator = content.length > 0 && !content.endsWith("\n") ? "\n" : "";
  return content + separator + line + "\n";
}
