import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search");
  const limit = parseInt(searchParams.get("limit") ?? "50");
  const offset = parseInt(searchParams.get("offset") ?? "0");
  const sortBy = searchParams.get("sortBy") ?? "matchScore";

  const where = search
    ? {
        OR: [
          { title: { contains: search } },
          { company: { contains: search } },
        ],
      }
    : {};

  const orderBy =
    sortBy === "matchScore"
      ? [{ matchScore: "desc" as const }, { scrapedAt: "desc" as const }]
      : [{ scrapedAt: "desc" as const }];

  const [jobs, total] = await Promise.all([
    prisma.discoveredJob.findMany({
      where,
      orderBy,
      take: limit,
      skip: offset,
      include: { requirements: { select: { id: true } } },
    }),
    prisma.discoveredJob.count({ where }),
  ]);

  return NextResponse.json({
    jobs: jobs.map((j) => ({
      ...j,
      requirementsCount: j.requirements.length,
      requirements: undefined,
    })),
    total,
  });
}
