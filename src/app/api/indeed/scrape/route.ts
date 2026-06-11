import { NextResponse } from "next/server";
import {
  startIndeedScrape,
  stopIndeedScrape,
} from "@/lib/automation/indeed/engine-indeed";
import { getIndeedState } from "@/lib/automation/indeed/state-indeed";

export async function GET() {
  return NextResponse.json(getIndeedState());
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));

  if (body.action === "stop") {
    await stopIndeedScrape();
    return NextResponse.json({ status: "stopping" });
  }

  const state = getIndeedState();
  if (state.status === "running") {
    return NextResponse.json(
      { error: "Scrape already running" },
      { status: 409 },
    );
  }

  // Fire and forget — the scrape runs in the background
  startIndeedScrape().catch(() => {});

  return NextResponse.json({ status: "started" });
}
