import { NextResponse } from "next/server";
import { scrapeProfile } from "@/lib/seo/scraper";
import { auditProfile } from "@/lib/seo/analyzer";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const { keywords } = await req.json();

    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return NextResponse.json({ error: "Keywords are required" }, { status: 400 });
    }

    const profileData = await scrapeProfile();
    const audit = await auditProfile(profileData, keywords);

    const saved = await prisma.seoAudit.create({
      data: {
        profileData: JSON.stringify(profileData),
        keywords: keywords.join(","),
        overallScore: audit.overallScore,
        sectionScores: JSON.stringify(audit.sections),
        summary: audit.summary,
      },
    });

    return NextResponse.json({ profileData, audit, id: saved.id });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Audit failed" },
      { status: 500 }
    );
  }
}
