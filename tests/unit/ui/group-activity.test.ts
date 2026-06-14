// tests/unit/ui/group-activity.test.ts
import { describe, it, expect } from "vitest";
import { groupActivity } from "@/lib/ui/group-activity";

const e = (action: string, ts: string, company?: string) => ({
  timestamp: ts,
  action,
  ...(company ? { job: { company } } : {}),
});

describe("groupActivity", () => {
  it("collapses consecutive same-action entries into one group with a count", () => {
    const g = groupActivity([
      e("indeed_start", "2026-06-14T10:03:00Z"),
      e("indeed_start", "2026-06-14T10:02:00Z"),
      e("indeed_start", "2026-06-14T10:01:00Z"),
    ]);
    expect(g).toHaveLength(1);
    expect(g[0].action).toBe("indeed_start");
    expect(g[0].count).toBe(3);
    expect(g[0].timestamp).toBe("2026-06-14T10:03:00Z");
  });

  it("keeps apply events for different companies separate", () => {
    const g = groupActivity([
      e("apply_success", "2026-06-14T10:05:00Z", "Figma"),
      e("apply_success", "2026-06-14T10:04:00Z", "Notion"),
    ]);
    expect(g).toHaveLength(2);
    expect(g[0].details.company).toBe("Figma");
    expect(g[1].details.company).toBe("Notion");
  });

  it("does not merge non-adjacent groups", () => {
    const g = groupActivity([
      e("indeed_start", "t5"),
      e("apply_success", "t4", "Figma"),
      e("indeed_start", "t3"),
    ]);
    expect(g.map((x) => x.action)).toEqual(["indeed_start", "apply_success", "indeed_start"]);
    expect(g.every((x) => x.count === 1)).toBe(true);
  });

  it("returns [] for []", () => {
    expect(groupActivity([])).toEqual([]);
  });
});
