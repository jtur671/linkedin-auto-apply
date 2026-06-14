"use client";

import { Sidebar } from "@/components/sidebar";

export function LayoutShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto p-6 bg-gradient-to-br from-background to-accent/40">
        {children}
      </main>
    </div>
  );
}
