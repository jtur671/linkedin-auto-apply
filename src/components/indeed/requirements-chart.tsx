"use client";

interface InsightItem {
  requirement: string;
  category: string;
  count: number;
  matchedCount: number;
  percentage: number;
}

const CATEGORY_COLORS: Record<string, string> = {
  technical_skill: "bg-blue-500",
  experience: "bg-purple-500",
  education: "bg-amber-500",
  certification: "bg-emerald-500",
  soft_skill: "bg-pink-500",
  other: "bg-gray-400",
};

export function RequirementsChart({
  insights,
}: {
  insights: InsightItem[];
}) {
  if (insights.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        No data yet. Scrape some Indeed jobs to see insights.
      </div>
    );
  }

  const maxCount = Math.max(...insights.map((i) => i.count));

  return (
    <div className="space-y-2">
      {insights.map((item, idx) => (
        <div key={idx} className="flex items-center gap-3">
          <div className="w-[280px] truncate text-sm" title={item.requirement}>
            {item.requirement}
          </div>
          <div className="flex-1 flex items-center gap-2">
            <div className="flex-1 h-6 bg-muted rounded-md overflow-hidden">
              <div
                className={`h-full rounded-md transition-all ${CATEGORY_COLORS[item.category] ?? "bg-gray-400"}`}
                style={{
                  width: `${(item.count / maxCount) * 100}%`,
                  opacity: item.matchedCount > 0 ? 1 : 0.5,
                }}
              />
            </div>
            <span className="text-xs text-muted-foreground w-[60px] text-right">
              {item.percentage}% jobs
            </span>
          </div>
          <div className="w-[24px] text-center">
            {item.matchedCount > 0 ? (
              <span className="text-emerald-600 text-xs font-medium">
                ✓
              </span>
            ) : (
              <span className="text-red-400 text-xs">✗</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
