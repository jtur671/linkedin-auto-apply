import { NextResponse } from "next/server";
import { getState, updateState, resetState } from "@/lib/automation/state";
import { startAutomation, stopAutomation } from "@/lib/automation/engine";

export async function GET(req: Request) { return NextResponse.json(getState()); }

export async function POST(req: Request) {
  const body = await req.json();
  const { action } = body;
  if (action === "start") {
    if (getState().status === "running") return NextResponse.json({ error: "Already running" }, { status: 409 });
    resetState();
    startAutomation().catch((err) => { updateState({ status: "error", currentJob: String(err) }); });
    return NextResponse.json({ success: true, status: "running" });
  }
  if (action === "stop") { await stopAutomation(); return NextResponse.json({ success: true, status: "stopping" }); }
  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
