import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const limit = parseInt(searchParams.get("limit") ?? "20");

  const where = category ? { category } : {};

  // Get all requirements grouped by text
  const requirements = await prisma.jobRequirement.findMany({
    where,
    select: {
      requirement: true,
      category: true,
      isRequired: true,
      matched: true,
    },
  });

  // Aggregate by requirement text (case-insensitive)
  const frequencyMap = new Map<
    string,
    {
      requirement: string;
      category: string;
      count: number;
      matchedCount: number;
      isRequired: boolean;
    }
  >();

  for (const req of requirements) {
    const key = req.requirement.toLowerCase().trim();
    const existing = frequencyMap.get(key);
    if (existing) {
      existing.count++;
      if (req.matched) existing.matchedCount++;
    } else {
      frequencyMap.set(key, {
        requirement: req.requirement,
        category: req.category,
        count: 1,
        matchedCount: req.matched ? 1 : 0,
        isRequired: req.isRequired,
      });
    }
  }

  // Sort by frequency
  const sorted = Array.from(frequencyMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);

  const totalJobs = await prisma.discoveredJob.count();

  return NextResponse.json({
    insights: sorted.map((item) => ({
      ...item,
      percentage: totalJobs > 0 ? Math.round((item.count / totalJobs) * 100) : 0,
    })),
    totalJobs,
  });
}
