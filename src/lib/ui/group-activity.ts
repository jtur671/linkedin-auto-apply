// src/lib/ui/group-activity.ts
export interface RawActivity {
  timestamp: string;
  action: string;
  job?: { title?: string; company?: string };
  details?: Record<string, unknown>;
}

export interface GroupedActivity {
  action: string;
  details: Record<string, unknown>;
  count: number;
  timestamp: string; // most recent in the group (input is newest-first)
}

// Group consecutive entries sharing (action, company). Adjacent only — a later
// run of the same action after something else starts a new group.
export function groupActivity(entries: RawActivity[]): GroupedActivity[] {
  const out: GroupedActivity[] = [];
  for (const entry of entries) {
    const details = {
      company: entry.job?.company,
      title: entry.job?.title,
      ...entry.details,
    };
    const last = out[out.length - 1];
    const sameCompany = (last?.details.company ?? null) === (details.company ?? null);
    if (last && last.action === entry.action && sameCompany) {
      last.count += 1; // newest timestamp already on the group (first seen wins)
    } else {
      out.push({ action: entry.action, details, count: 1, timestamp: entry.timestamp });
    }
  }
  return out;
}
