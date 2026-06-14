"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Home, Briefcase, UserRound, Settings } from "lucide-react";
import { StatusPill } from "@/components/scout/status-pill";

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/jobs", label: "Jobs", icon: Briefcase },
  { href: "/profile", label: "Profile", icon: UserRound },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

function useQueueCount() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch("/api/queue");
        if (!res.ok) return;
        const data = await res.json();
        const jobs = Array.isArray(data.jobs) ? data.jobs : [];
        if (alive) setCount(jobs.length);
      } catch {
        // queue unavailable — leave the badge as-is
      }
    };
    load();
    // Poll so the badge tracks the queue as it drains (the sidebar persists across nav).
    const id = setInterval(load, 5000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  return count;
}

export function Sidebar() {
  const pathname = usePathname();
  const queueCount = useQueueCount();

  return (
    <aside className="flex h-screen w-60 flex-col border-r bg-sidebar shadow-scout">
      {/* Brand block */}
      <div className="flex h-16 items-center gap-2.5 border-b px-5">
        <div className="size-5 shrink-0 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500" />
        <span className="font-extrabold text-lg tracking-tight text-sidebar-foreground">
          Scout
        </span>
      </div>

      {/* Nav items */}
      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span className="flex-1">{item.label}</span>
              {item.href === "/" && queueCount !== null && queueCount > 0 && (
                <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-xs font-bold text-primary tabular-nums leading-none">
                  {queueCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Status pill pinned at bottom */}
      <div className="border-t px-3 py-4">
        <StatusPill />
      </div>
    </aside>
  );
}
