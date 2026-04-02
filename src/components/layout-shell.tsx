"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { AdProvider } from "@/components/ads/ad-provider";

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    fetch("/api/onboarding/status")
      .then((r) => r.json())
      .then((data) => {
        if (data.needsOnboarding && pathname !== "/onboarding") {
          router.push("/onboarding");
        }
        setChecking(false);
      })
      .catch(() => setChecking(false));
  }, [pathname, router]);

  if (checking) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  // Onboarding page: full width, no sidebar
  if (pathname === "/onboarding") {
    return <>{children}</>;
  }

  // Normal dashboard: sidebar + content
  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto p-6">
        <AdProvider>{children}</AdProvider>
      </main>
    </div>
  );
}
