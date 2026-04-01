import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  const configs = await prisma.searchConfig.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ configs });
}

export async function POST(req: Request) {
  const body = await req.json();
  const config = await prisma.searchConfig.create({
    data: {
      keywords: body.keywords,
      location: body.location ?? "",
      remotePreference: body.remotePreference ?? "any",
      experienceLevel: body.experienceLevel ?? "senior",
      datePosted: body.datePosted ?? "past_24_hours",
      isActive: body.isActive ?? true,
    },
  });
  return NextResponse.json(config, { status: 201 });
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  await prisma.searchConfig.delete({ where: { id: parseInt(id) } });
  return NextResponse.json({ success: true });
}
