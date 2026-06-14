"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { StatChip } from "@/components/scout/stat-chip";
import { SourceChip } from "@/components/scout/source-chip";
import { ScoreRing } from "@/components/scout/score-ring";
import { JobTable, type FoundJob } from "@/components/scout/job-table";
import { outcomeCopy } from "@/lib/ui/outcome-copy";
import { cn } from "@/lib/utils";
import { Briefcase, Radar, Sparkles, CheckCircle2 } from "lucide-react";

// ---- Shared row shapes ----------------------------------------------------

// A DiscoveredJob row (full API shape from /api/indeed list).
interface DiscoveredRow {
  id: number;
  source: string;
  title: string;
  company: string;
  location: string;
  salary: string | null;
  matchScore: number | null;
  applyUrl: string | null;
  url: string;
  requirementsCount: number;
  scrapedAt: string;
  applyOutcome: string | null;
  appliedAt: string | null;
  dismissedAt: string | null;
}

// A LinkedIn Job row (from /api/jobs).
interface LinkedInRow {
  id: number;
  title: string;
  company: string;
  location: string;
  url: string;
  status: string;
  skipReason: string | null;
  appliedAt: string;
}

interface SourceInfo {
  id: string;
  label: string;
  configured: boolean;
}

type Tab = "found" | "applied" | "passed";
const TABS: { id: Tab; label: string }[] = [
  { id: "found", label: "Found" },
  { id: "applied", label: "Applied" },
  { id: "passed", label: "Passed" },
];

function parseTab(value: string | null): Tab {
  return value === "applied" || value === "passed" ? value : "found";
}

// ---- Page -----------------------------------------------------------------

export default function JobsPage() {
  return (
    <Suspense fallback={<PageFrame tab="found" onTab={() => {}} stats={null} />}>
      <JobsPageInner />
    </Suspense>
  );
}

function JobsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = parseTab(searchParams.get("tab"));

  const [discovered, setDiscovered] = useState<DiscoveredRow[] | null>(null);
  const [linkedinApplied, setLinkedinApplied] = useState<LinkedInRow[] | null>(
    null,
  );
  const [linkedinDismissed, setLinkedinDismissed] = useState<
    LinkedInRow[] | null
  >(null);
  const [sources, setSources] = useState<SourceInfo[]>([]);

  // Found-tab controls.
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"matchScore" | "date">("matchScore");
  const [sourceFilter, setSourceFilter] = useState<string | null>(null);

  const refresh = useCallback(() => {
    // Single-user local DB — pull the full discovered list and filter client
    // side (the list API has no found/dismissed filter).
    fetch("/api/indeed?limit=500")
      .then((r) => r.json())
      .then((d) =>
        setDiscovered(Array.isArray(d.jobs) ? (d.jobs as DiscoveredRow[]) : []),
      )
      .catch(() => setDiscovered((prev) => prev ?? []));

    fetch("/api/jobs?status=applied&limit=500")
      .then((r) => r.json())
      .then((d) =>
        setLinkedinApplied(
          Array.isArray(d.jobs) ? (d.jobs as LinkedInRow[]) : [],
        ),
      )
      .catch(() => setLinkedinApplied((prev) => prev ?? []));

    fetch("/api/jobs?status=dismissed&limit=500")
      .then((r) => r.json())
      .then((d) =>
        setLinkedinDismissed(
          Array.isArray(d.jobs) ? (d.jobs as LinkedInRow[]) : [],
        ),
      )
      .catch(() => setLinkedinDismissed((prev) => prev ?? []));

    fetch("/api/sources")
      .then((r) => r.json())
      .then((d) => setSources(Array.isArray(d.sources) ? d.sources : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  function setTab(next: Tab) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", next);
    router.replace(`/jobs?${params.toString()}`, { scroll: false });
  }

  // ---- Derived stat strip (absorbs the old Insights page) -----------------
  const stats = useMemo(() => {
    if (discovered === null) return null;
    const perSource = new Map<string, number>();
    for (const j of discovered) {
      if (j.dismissedAt || j.applyOutcome) continue; // count Found only
      perSource.set(j.source, (perSource.get(j.source) ?? 0) + 1);
    }
    const found = discovered.filter(
      (j) => !j.dismissedAt && !j.applyOutcome,
    ).length;
    const sourcesActive = sources.filter((s) => s.configured).length;
    return { found, sourcesActive, perSource };
  }, [discovered, sources]);

  // ---- Found tab rows -----------------------------------------------------
  const foundRows: FoundJob[] = useMemo(() => {
    if (!discovered) return [];
    let rows = discovered.filter((j) => !j.dismissedAt && !j.applyOutcome);
    if (sourceFilter) rows = rows.filter((j) => j.source === sourceFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (j) =>
          j.title.toLowerCase().includes(q) ||
          j.company.toLowerCase().includes(q),
      );
    }
    rows = [...rows].sort((a, b) => {
      if (sortBy === "matchScore") {
        const sa = a.matchScore ?? -1;
        const sb = b.matchScore ?? -1;
        if (sb !== sa) return sb - sa;
      }
      return (
        new Date(b.scrapedAt).getTime() - new Date(a.scrapedAt).getTime()
      );
    });
    return rows;
  }, [discovered, sourceFilter, search, sortBy]);

  // Sources that actually appear in the Found set, for the filter chips.
  const foundSourceCounts = useMemo(() => {
    const m = new Map<string, number>();
    if (!discovered) return m;
    for (const j of discovered) {
      if (j.dismissedAt || j.applyOutcome) continue;
      m.set(j.source, (m.get(j.source) ?? 0) + 1);
    }
    return m;
  }, [discovered]);

  // ---- Applied tab: merge discovered submitted + LinkedIn applied ---------
  const appliedRows: AppliedRow[] = useMemo(() => {
    const rows: AppliedRow[] = [];
    for (const j of discovered ?? []) {
      if (j.applyOutcome === "submitted") {
        rows.push({
          key: `d-${j.id}`,
          id: j.id,
          origin: "discovered",
          source: j.source,
          title: j.title,
          company: j.company,
          location: j.location,
          matchScore: j.matchScore,
          url: j.applyUrl ?? j.url,
          when: j.appliedAt ?? j.scrapedAt,
          outcome: j.applyOutcome,
          detailHref: `/jobs/${j.id}`,
        });
      }
    }
    for (const j of linkedinApplied ?? []) {
      rows.push({
        key: `l-${j.id}`,
        id: j.id,
        origin: "linkedin",
        source: "linkedin",
        title: j.title,
        company: j.company,
        location: j.location,
        matchScore: null,
        url: j.url,
        when: j.appliedAt,
        outcome: "submitted",
        detailHref: null,
      });
    }
    return rows.sort(
      (a, b) => new Date(b.when).getTime() - new Date(a.when).getTime(),
    );
  }, [discovered, linkedinApplied]);

  // ---- Passed tab: discovered dismissed + LinkedIn dismissed --------------
  const passedRows: PassedRow[] = useMemo(() => {
    const rows: PassedRow[] = [];
    for (const j of discovered ?? []) {
      if (j.dismissedAt) {
        rows.push({
          key: `d-${j.id}`,
          id: j.id,
          origin: "discovered",
          source: j.source,
          title: j.title,
          company: j.company,
          location: j.location,
          matchScore: j.matchScore,
          when: j.dismissedAt,
          reason: null,
          detailHref: `/jobs/${j.id}`,
        });
      }
    }
    for (const j of linkedinDismissed ?? []) {
      rows.push({
        key: `l-${j.id}`,
        id: j.id,
        origin: "linkedin",
        source: "linkedin",
        title: j.title,
        company: j.company,
        location: j.location,
        matchScore: null,
        when: j.appliedAt,
        reason: j.skipReason,
        detailHref: null,
      });
    }
    return rows.sort(
      (a, b) => new Date(b.when).getTime() - new Date(a.when).getTime(),
    );
  }, [discovered, linkedinDismissed]);

  // ---- Restore handlers (Passed tab) --------------------------------------
  const restoreDiscovered = useCallback((id: number) => {
    setDiscovered((prev) =>
      prev ? prev.map((j) => (j.id === id ? { ...j, dismissedAt: null } : j)) : prev,
    );
    fetch(`/api/jobs/${id}/dismiss`, { method: "DELETE" }).catch(() => {});
  }, []);

  const restoreLinkedIn = useCallback((id: number) => {
    setLinkedinDismissed((prev) =>
      prev ? prev.filter((j) => j.id !== id) : prev,
    );
    // Legacy path — clears the dismissed state by returning it to review.
    fetch("/api/jobs", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: "needs_review" }),
    }).catch(() => {});
  }, []);

  const statStrip = stats;

  return (
    <PageFrame tab={tab} onTab={setTab} stats={statStrip} sources={sources}>
      {tab === "found" && (
        <FoundTab
          loading={discovered === null}
          rows={foundRows}
          search={search}
          onSearch={setSearch}
          sortBy={sortBy}
          onSort={setSortBy}
          sourceFilter={sourceFilter}
          onSourceFilter={setSourceFilter}
          sourceCounts={foundSourceCounts}
        />
      )}
      {tab === "applied" && (
        <AppliedTab
          loading={discovered === null || linkedinApplied === null}
          rows={appliedRows}
        />
      )}
      {tab === "passed" && (
        <PassedTab
          loading={discovered === null || linkedinDismissed === null}
          rows={passedRows}
          onRestoreDiscovered={restoreDiscovered}
          onRestoreLinkedIn={restoreLinkedIn}
        />
      )}
    </PageFrame>
  );
}

// ---- Page chrome ----------------------------------------------------------

function PageFrame({
  tab,
  onTab,
  stats,
  sources,
  children,
}: {
  tab: Tab;
  onTab: (t: Tab) => void;
  stats: { found: number; sourcesActive: number; perSource: Map<string, number> } | null;
  sources?: SourceInfo[];
  children?: React.ReactNode;
}) {
  // Top sources by Found count, for the stat strip.
  const topSources = stats
    ? [...stats.perSource.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3)
    : [];

  return (
    <div className="mx-auto max-w-5xl space-y-7">
      <header className="space-y-1">
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          Jobs 💼
        </h1>
        <p className="text-muted-foreground">
          Everything Scout has found, applied to, and set aside — all in one place.
        </p>
      </header>

      {/* Stat strip (absorbs the old Insights page) */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatChip
          label="Found, waiting"
          value={stats?.found ?? null}
          icon={<Sparkles className="size-3.5" />}
        />
        <StatChip
          label="Sources active"
          value={stats?.sourcesActive ?? null}
          icon={<Radar className="size-3.5" />}
        />
        {topSources.slice(0, 2).map(([src, count]) => (
          <StatChip
            key={src}
            label={sourceLabel(src, sources)}
            value={count}
            icon={<Briefcase className="size-3.5" />}
          />
        ))}
        {/* Keep the grid full when there are few sources. */}
        {Array.from({ length: Math.max(0, 2 - topSources.length) }).map(
          (_, i) => (
            <StatChip
              key={`ph-${i}`}
              label={i === 0 ? "Applied" : "Set aside"}
              value={null}
              icon={
                i === 0 ? (
                  <CheckCircle2 className="size-3.5" />
                ) : (
                  <Briefcase className="size-3.5" />
                )
              }
            />
          ),
        )}
      </div>

      {/* Segmented pill tabs */}
      <div
        role="tablist"
        aria-label="Job lists"
        className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-card p-1 shadow-scout"
      >
        {TABS.map((t) => {
          const active = t.id === tab;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={active}
              onClick={() => onTab(t.id)}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <div>{children}</div>
    </div>
  );
}

function sourceLabel(id: string, sources?: SourceInfo[]): string {
  const found = sources?.find((s) => s.id === id);
  if (found) return found.label;
  return id.charAt(0).toUpperCase() + id.slice(1);
}

// ---- Found tab ------------------------------------------------------------

function FoundTab({
  loading,
  rows,
  search,
  onSearch,
  sortBy,
  onSort,
  sourceFilter,
  onSourceFilter,
  sourceCounts,
}: {
  loading: boolean;
  rows: FoundJob[];
  search: string;
  onSearch: (s: string) => void;
  sortBy: "matchScore" | "date";
  onSort: (s: "matchScore" | "date") => void;
  sourceFilter: string | null;
  onSourceFilter: (s: string | null) => void;
  sourceCounts: Map<string, number>;
}) {
  const sourceIds = [...sourceCounts.keys()];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search by title or company…"
          className="h-10 w-full max-w-xs rounded-full border border-border bg-card px-4 text-sm text-foreground shadow-scout placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <div className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-card p-1 text-sm shadow-scout">
          {(["matchScore", "date"] as const).map((s) => (
            <button
              key={s}
              onClick={() => onSort(s)}
              className={cn(
                "rounded-full px-3 py-1 font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                sortBy === s
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {s === "matchScore" ? "Best match" : "Newest"}
            </button>
          ))}
        </div>
      </div>

      {sourceIds.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <FilterPill
            active={sourceFilter === null}
            onClick={() => onSourceFilter(null)}
          >
            All sources
          </FilterPill>
          {sourceIds.map((src) => (
            <button
              key={src}
              onClick={() =>
                onSourceFilter(sourceFilter === src ? null : src)
              }
              className={cn(
                "rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                sourceFilter === src
                  ? "ring-2 ring-primary ring-offset-1 ring-offset-background"
                  : "opacity-80 hover:opacity-100",
              )}
            >
              <SourceChip source={src} />
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <ListSkeleton />
      ) : rows.length === 0 ? (
        <EmptyState
          emoji="🔎"
          title={
            search || sourceFilter
              ? "No matches with those filters"
              : "Nothing waiting yet"
          }
          body={
            search || sourceFilter
              ? "Try clearing the search or picking a different source."
              : "When Scout finds fresh jobs, they'll line up right here."
          }
        />
      ) : (
        <JobTable jobs={rows} />
      )}
    </div>
  );
}

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full px-3 py-0.5 text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active
          ? "bg-primary text-primary-foreground"
          : "bg-muted text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

// ---- Applied tab ----------------------------------------------------------

interface AppliedRow {
  key: string;
  id: number;
  origin: "discovered" | "linkedin";
  source: string;
  title: string;
  company: string;
  location: string;
  matchScore: number | null;
  url: string;
  when: string;
  outcome: string | null;
  detailHref: string | null;
}

function AppliedTab({
  loading,
  rows,
}: {
  loading: boolean;
  rows: AppliedRow[];
}) {
  if (loading) return <ListSkeleton />;
  if (rows.length === 0) {
    return (
      <EmptyState
        emoji="🎉"
        title="No applications yet"
        body="Once you apply — or Scout applies for you — those jobs show up here."
      />
    );
  }
  return (
    <StaggerList>
      {rows.map((job) => (
        <article
          key={job.key}
          className="rounded-2xl border border-border/60 bg-card p-4 shadow-scout transition-all duration-300 ease-out hover:-translate-y-0.5"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <RowTitle title={job.title} href={job.detailHref} url={job.url} />
                <SourceChip source={job.source} />
                <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
                  {outcomeCopy(job.outcome)}
                </span>
              </div>
              <p className="mt-1 truncate text-sm text-muted-foreground">
                {job.company} · {job.location}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatWhen(job.when)}
              </p>
            </div>
            <div className="shrink-0">
              <ScoreRing score={job.matchScore} size={36} />
            </div>
          </div>
        </article>
      ))}
    </StaggerList>
  );
}

// ---- Passed tab -----------------------------------------------------------

interface PassedRow {
  key: string;
  id: number;
  origin: "discovered" | "linkedin";
  source: string;
  title: string;
  company: string;
  location: string;
  matchScore: number | null;
  when: string;
  reason: string | null;
  detailHref: string | null;
}

function PassedTab({
  loading,
  rows,
  onRestoreDiscovered,
  onRestoreLinkedIn,
}: {
  loading: boolean;
  rows: PassedRow[];
  onRestoreDiscovered: (id: number) => void;
  onRestoreLinkedIn: (id: number) => void;
}) {
  if (loading) return <ListSkeleton />;
  if (rows.length === 0) {
    return (
      <EmptyState
        emoji="🍃"
        title="Nothing set aside"
        body="Jobs you pass on land here — you can always bring them back."
      />
    );
  }
  return (
    <StaggerList>
      {rows.map((job) => (
        <article
          key={job.key}
          className="rounded-2xl border border-border/60 bg-card/70 p-4 shadow-scout"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <RowTitle title={job.title} href={job.detailHref} />
                <SourceChip source={job.source} />
              </div>
              <p className="mt-1 truncate text-sm text-muted-foreground">
                {job.company} · {job.location}
              </p>
              {job.reason && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Scout paused here: {job.reason}
                </p>
              )}
              <p className="mt-1 text-xs text-muted-foreground">
                Passed {formatWhen(job.when)}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2.5">
              <ScoreRing score={job.matchScore} size={36} />
              <button
                onClick={() =>
                  job.origin === "discovered"
                    ? onRestoreDiscovered(job.id)
                    : onRestoreLinkedIn(job.id)
                }
                className="inline-flex items-center justify-center rounded-full border border-border px-3.5 py-1.5 text-xs font-bold text-muted-foreground transition-all hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Restore
              </button>
            </div>
          </div>
        </article>
      ))}
    </StaggerList>
  );
}

// ---- Shared bits ----------------------------------------------------------

function RowTitle({
  title,
  href,
  url,
}: {
  title: string;
  href: string | null;
  url?: string;
}) {
  if (href) {
    return (
      <Link
        href={href}
        className="truncate font-bold text-foreground hover:underline focus-visible:underline focus-visible:outline-none"
      >
        {title}
      </Link>
    );
  }
  if (url) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="truncate font-bold text-foreground hover:underline focus-visible:underline focus-visible:outline-none"
      >
        {title}
      </a>
    );
  }
  return <span className="truncate font-bold text-foreground">{title}</span>;
}

function StaggerList({ children }: { children: React.ReactNode[] }) {
  return (
    <ul className="space-y-2.5">
      {children.map((child, i) => (
        <li
          key={i}
          style={{
            animation: `jobsListIn 0.4s cubic-bezier(0.22,1,0.36,1) ${Math.min(i, 10) * 45}ms backwards`,
          }}
        >
          {child}
        </li>
      ))}
      <style>{`
        @keyframes jobsListIn {
          from { opacity: 0; transform: translateY(8px) scale(0.99); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </ul>
  );
}

function EmptyState({
  emoji,
  title,
  body,
}: {
  emoji: string;
  title: string;
  body: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 px-6 py-16 text-center shadow-scout">
      <div className="text-4xl">{emoji}</div>
      <p className="mt-3 text-lg font-bold text-foreground">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

function ListSkeleton() {
  return (
    <ul className="space-y-2.5" aria-hidden>
      {Array.from({ length: 4 }).map((_, i) => (
        <li
          key={i}
          className="rounded-2xl border border-border/60 bg-card p-4 shadow-scout"
        >
          <div className="h-4 w-2/3 rounded-full bg-muted" />
          <div className="mt-2 h-3 w-1/2 rounded-full bg-muted" />
        </li>
      ))}
    </ul>
  );
}

function formatWhen(value: string): string {
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
