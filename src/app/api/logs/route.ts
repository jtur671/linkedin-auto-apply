import { NextResponse } from "next/server";
import { readLogs } from "@/lib/logging/log-reader";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action") ?? undefined;
  const date = searchParams.get("date") ?? undefined;
  const exportFormat = searchParams.get("export");
  const logs = readLogs(undefined, { action, date });
  if (exportFormat === "json") {
    const content = logs.map((l) => JSON.stringify(l)).join("\n");
    return new Response(content, {
      headers: { "Content-Type": "application/jsonl", "Content-Disposition": `attachment; filename="automation-logs-${date ?? "all"}.jsonl"` },
    });
  }
  return NextResponse.json({ logs, total: logs.length });
}
