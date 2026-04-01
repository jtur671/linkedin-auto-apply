import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { encrypt, decrypt } from "@/lib/encryption/crypto";

function getEncryptionKey(): string {
  const key = process.env.ENCRYPTION_KEY;
  if (!key || key.length < 32) throw new Error("ENCRYPTION_KEY env var must be set");
  return key.padEnd(64, "0").slice(0, 64);
}

export async function GET(req: Request) {
  const credential = await prisma.credential.findFirst();
  if (!credential) return NextResponse.json({ hasCredentials: false });
  try {
    const key = getEncryptionKey();
    const email = decrypt(credential.email, key);
    return NextResponse.json({ hasCredentials: true, email, password: "********" });
  } catch { return NextResponse.json({ hasCredentials: true, email: "***", password: "********" }); }
}

export async function POST(req: Request) {
  const body = await req.json();
  const key = getEncryptionKey();
  await prisma.credential.deleteMany();
  await prisma.credential.create({
    data: { email: encrypt(body.email, key), password: encrypt(body.password, key), encryptionCheck: encrypt("valid", key) },
  });
  return NextResponse.json({ success: true }, { status: 201 });
}

export async function DELETE(req: Request) {
  await prisma.credential.deleteMany();
  return NextResponse.json({ success: true });
}
