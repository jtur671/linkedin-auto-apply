import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  const answers = await prisma.profileAnswer.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ answers });
}

export async function POST(req: Request) {
  const body = await req.json();
  const answer = await prisma.profileAnswer.create({
    data: { fieldLabel: body.fieldLabel, fieldType: body.fieldType, answer: body.answer },
  });
  return NextResponse.json(answer, { status: 201 });
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  await prisma.profileAnswer.delete({ where: { id: parseInt(id) } });
  return NextResponse.json({ success: true });
}
