"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { BarChart3, Briefcase, AlertCircle, Settings, Search, ScrollText } from "lucide-react";

const navItems = [
  { href: "/", label: "Dashboard", icon: BarChart3 },
  { href: "/jobs", label: "Applied Jobs", icon: Briefcase },
  { href: "/review", label: "Needs Review", icon: AlertCircle },
  { href: "/seo", label: "Profile SEO", icon: Search },
  { href: "/config", label: "Configuration", icon: Settings },
  { href: "/logs", label: "Logs", icon: ScrollText },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-card">
      <div className="flex h-14 items-center border-b px-4">
        <h1 className="text-lg font-semibold">LinkedIn Auto Apply</h1>
      </div>
      <nav className="flex-1 space-y-1 p-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link key={item.href} href={item.href}
              className={cn("flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
              <item.icon className="h-4 w-4" />{item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
