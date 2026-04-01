import { NextResponse } from "next/server";
import { getState, updateState, resetState } from "@/lib/automation/state";

export async function GET(req: Request) { return NextResponse.json(getState()); }

export async function POST(req: Request) {
  const body = await req.json();
  const { action } = body;
  if (action === "start") {
    if (getState().status === "running") return NextResponse.json({ error: "Already running" }, { status: 409 });
    resetState();
    updateState({ status: "running", startedAt: new Date().toISOString() });
    return NextResponse.json({ success: true, status: "running" });
  }
  if (action === "stop") { updateState({ status: "stopping" }); return NextResponse.json({ success: true, status: "stopping" }); }
  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
