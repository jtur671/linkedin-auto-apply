"use client";
import { useEffect, useState, useCallback } from "react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { CredentialsForm } from "@/components/config/credentials-form";
import { SearchConfigForm } from "@/components/config/search-config-form";
import { ProfileAnswersForm } from "@/components/config/profile-answers-form";
import { AIProviderForm } from "@/components/config/ai-provider-form";
import { ResumeUpload } from "@/components/config/resume-upload";
import { Settings2, RefreshCw, Sun, Moon, FileText } from "lucide-react";

/* ── Appearance pill toggle ─────────────────────────────────────── */

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  if (!mounted) {
    // Avoid hydration mismatch — render an empty shell the same size
    return <div className="h-9 w-[136px] rounded-full bg-muted border border-border" />;
  }

  const isDark = theme === "dark";

  return (
    <div
      role="group"
      aria-label="Colour scheme"
      className="inline-flex items-center rounded-full border border-border bg-muted p-1 gap-1"
    >
      <button
        onClick={() => setTheme("light")}
        aria-pressed={!isDark}
        className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold transition-all
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary
          ${!isDark ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
      >
        <Sun className="h-3.5 w-3.5" />
        Light
      </button>
      <button
        onClick={() => setTheme("dark")}
        aria-pressed={isDark}
        className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold transition-all
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary
          ${isDark ? "bg-foreground/10 text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
      >
        <Moon className="h-3.5 w-3.5" />
        Dark
      </button>
    </div>
  );
}

/* ── Appearance section (standalone card — no nested form) ────── */

function AppearanceCard() {
  return (
    <section className="rounded-2xl shadow-scout bg-card border border-border overflow-hidden">
      <div className="px-6 py-4 border-b border-border">
        <h2 className="text-base font-extrabold text-foreground">Appearance</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Choose how Scout looks. Saved in this browser.
        </p>
      </div>
      <div className="px-6 py-4">
        <ThemeToggle />
      </div>
    </section>
  );
}

/* ── Section label above an existing form card ─────────────────── */

function SectionLabel({ title, description }: { title: string; description?: string }) {
  return (
    <div className="space-y-0.5 mb-1">
      <h2 className="text-base font-extrabold text-foreground">{title}</h2>
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
    </div>
  );
}

/* ── Page ──────────────────────────────────────────────────────── */

export default function SettingsPage() {
  const [session, setSession] = useState<any>(null);
  const [configs, setConfigs] = useState<any[]>([]);
  const [answers, setAnswers] = useState<any[]>([]);

  const fetchAll = useCallback(() => {
    fetch("/api/session").then((r) => r.json()).then(setSession);
    fetch("/api/config").then((r) => r.json()).then((d) => setConfigs(d.configs ?? []));
    fetch("/api/config/profile-answers")
      .then((r) => r.json())
      .then((d) => setAnswers(d.answers ?? []));
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  return (
    <div className="space-y-8 max-w-3xl">

      {/* ── Page header ──────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Settings2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
              Settings
            </h1>
            <p className="text-sm text-muted-foreground">
              Everything Scout needs to find and apply for jobs on your behalf.
            </p>
          </div>
        </div>
        <Link
          href="/onboarding"
          className="shrink-0 flex items-center gap-1.5 rounded-full border border-border bg-muted
            px-4 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground
            hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2
            focus-visible:ring-primary"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Re-run setup
        </Link>
      </div>

      {/* ── Appearance ───────────────────────────────────────────── */}
      <AppearanceCard />

      {/* ── LinkedIn account ─────────────────────────────────────── */}
      <div className="space-y-2">
        <SectionLabel
          title="LinkedIn account"
          description="Scout uses your credentials to log in and submit applications."
        />
        {session ? (
          <CredentialsForm session={session} onRefresh={fetchAll} />
        ) : (
          <div className="rounded-2xl shadow-scout bg-card border border-border px-6 py-5">
            <p className="text-sm text-muted-foreground">Loading…</p>
          </div>
        )}
      </div>

      {/* ── AI provider ──────────────────────────────────────────── */}
      <div className="space-y-2">
        <SectionLabel
          title="AI provider"
          description="Used to analyse your profile and score job matches."
        />
        <AIProviderForm onRefresh={fetchAll} />
      </div>

      {/* ── Job searches ─────────────────────────────────────────── */}
      <div className="space-y-2">
        <SectionLabel
          title="Job searches"
          description="Add saved searches — Scout runs these on autopilot."
        />
        <SearchConfigForm configs={configs} onRefresh={fetchAll} />
      </div>

      {/* ── Auto-fill answers ────────────────────────────────────── */}
      <div className="space-y-2">
        <SectionLabel
          title="Auto-fill answers"
          description="Stored answers Scout uses when application forms ask standard questions."
        />
        <ProfileAnswersForm answers={answers} onRefresh={fetchAll} />
      </div>

      {/* ── Resume ───────────────────────────────────────────────── */}
      <div className="space-y-2">
        <SectionLabel
          title="Resume"
          description="Upload once and Scout attaches it automatically where needed."
        />
        <ResumeUpload />
      </div>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <div className="flex items-center justify-center pt-2 pb-4">
        <Link
          href="/settings/logs"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground
            transition-colors focus-visible:outline-none focus-visible:ring-2
            focus-visible:ring-primary rounded"
        >
          <FileText className="h-3.5 w-3.5" />
          Raw activity log →
        </Link>
      </div>
    </div>
  );
}
