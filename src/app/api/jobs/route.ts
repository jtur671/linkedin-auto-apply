import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const limit = parseInt(searchParams.get("limit") ?? "50");
  const offset = parseInt(searchParams.get("offset") ?? "0");
  const statsOnly = searchParams.get("stats") === "true";

  if (statsOnly) {
    const [total, applied, skipped, needsReview, errors] = await Promise.all([
      prisma.job.count(),
      prisma.job.count({ where: { status: "applied" } }),
      prisma.job.count({ where: { status: "skipped" } }),
      prisma.job.count({ where: { status: "needs_review" } }),
      prisma.job.count({ where: { status: "error" } }),
    ]);
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const appliedToday = await prisma.job.count({ where: { status: "applied", appliedAt: { gte: todayStart } } });
    const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - 7);
    const appliedThisWeek = await prisma.job.count({ where: { status: "applied", appliedAt: { gte: weekStart } } });
    const topCompanies = await prisma.job.groupBy({
      by: ["company"], where: { status: "applied" },
      _count: { company: true }, orderBy: { _count: { company: "desc" } }, take: 10,
    });
    return NextResponse.json({
      stats: { total, applied, skipped, needsReview, errors, appliedToday, appliedThisWeek,
        topCompanies: topCompanies.map((c) => ({ company: c.company, count: c._count.company })),
      },
    });
  }

  const where = status ? { status } : {};
  const [jobs, total] = await Promise.all([
    prisma.job.findMany({ where, orderBy: { appliedAt: "desc" }, take: limit, skip: offset }),
    prisma.job.count({ where }),
  ]);
  return NextResponse.json({ jobs, total });
}
