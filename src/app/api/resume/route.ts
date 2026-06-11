import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import path from "path";
import fs from "fs/promises";

const UPLOAD_DIR = path.join(process.cwd(), "uploads", "resumes");

async function extractText(buffer: Buffer, filename: string): Promise<string> {
  const ext = path.extname(filename).toLowerCase();

  if (ext === ".txt") {
    return buffer.toString("utf-8");
  }

  if (ext === ".pdf") {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    const result = await parser.getText();
    return result.text;
  }

  if (ext === ".docx") {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  throw new Error(`Unsupported file type: ${ext}. Use PDF, DOCX, or TXT.`);
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const ext = path.extname(file.name).toLowerCase();
    if (![".pdf", ".docx", ".txt"].includes(ext)) {
      return NextResponse.json(
        { error: "Unsupported file type. Use PDF, DOCX, or TXT." },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const content = await extractText(buffer, file.name);

    if (!content.trim()) {
      return NextResponse.json(
        { error: "Could not extract text from file. Is it empty?" },
        { status: 400 },
      );
    }

    // Save file to disk
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    const savedName = `resume-${Date.now()}${ext}`;
    const savedPath = path.join(UPLOAD_DIR, savedName);
    await fs.writeFile(savedPath, buffer);

    // Deactivate previous resumes
    await prisma.resume.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    });

    // Create new active resume
    const resume = await prisma.resume.create({
      data: {
        filename: file.name,
        content,
        rawPath: savedPath,
        isActive: true,
      },
    });

    return NextResponse.json({
      resume: {
        id: resume.id,
        filename: resume.filename,
        uploadedAt: resume.uploadedAt,
        preview: content.slice(0, 200),
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload failed" },
      { status: 500 },
    );
  }
}

export async function GET() {
  const resume = await prisma.resume.findFirst({
    where: { isActive: true },
    orderBy: { uploadedAt: "desc" },
  });

  if (!resume) {
    return NextResponse.json({ resume: null });
  }

  return NextResponse.json({
    resume: {
      id: resume.id,
      filename: resume.filename,
      uploadedAt: resume.uploadedAt,
      preview: resume.content.slice(0, 200),
    },
  });
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = parseInt(searchParams.get("id") ?? "");

  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const resume = await prisma.resume.findUnique({ where: { id } });
  if (resume) {
    await fs.unlink(resume.rawPath).catch(() => {});
    await prisma.resume.delete({ where: { id } });
  }

  return NextResponse.json({ success: true });
}
