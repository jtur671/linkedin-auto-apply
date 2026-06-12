// src/app/api/jobs/[id]/dismiss/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const jobId = parseInt(id);
  if (isNaN(jobId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  const row = await prisma.discoveredJob.findUnique({ where: { id: jobId } });
  if (!row) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  await prisma.discoveredJob.update({ where: { id: jobId }, data: { dismissedAt: new Date() } });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const jobId = parseInt(id);
  if (isNaN(jobId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  const row = await prisma.discoveredJob.findUnique({ where: { id: jobId } });
  if (!row) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  await prisma.discoveredJob.update({ where: { id: jobId }, data: { dismissedAt: null } });
  return NextResponse.json({ ok: true });
}
