import { NextResponse } from "next/server";
import { rewriteSection } from "@/lib/seo/analyzer";

export async function POST(req: Request) {
  try {
    const { section, currentContent, keywords, profileData } = await req.json();

    if (!section || !currentContent || !keywords?.length) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const result = await rewriteSection(section, currentContent, keywords, profileData);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Rewrite failed" },
      { status: 500 }
    );
  }
}
