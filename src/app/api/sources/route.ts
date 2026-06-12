// src/app/api/sources/route.ts
import { NextResponse } from "next/server";
import { registeredSources } from "@/lib/sources/registry";

export async function GET() {
  const sources = registeredSources().map((s) => ({
    id: s.id, label: s.label, configured: s.isConfigured(),
  }));
  return NextResponse.json({ sources });
}
