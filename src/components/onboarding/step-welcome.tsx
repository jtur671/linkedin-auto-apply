"use client";

import { Button } from "@/components/ui/button";
import { Sparkles, Clock, Briefcase, KeyRound } from "lucide-react";

interface StepWelcomeProps {
  onNext: () => void;
}

const THINGS_WE_NEED = [
  {
    icon: KeyRound,
    text: "Your LinkedIn login",
  },
  {
    icon: Briefcase,
    text: "Job titles you're interested in",
  },
  {
    icon: Clock,
    text: "About 5 minutes of your time",
  },
];

export function StepWelcome({ onNext }: StepWelcomeProps) {
  return (
    <div
      className="flex flex-col items-center text-center gap-8"
      style={{
        animation: "scoutFadeUp 0.45s cubic-bezier(0.16, 1, 0.3, 1) both",
      }}
    >
      <style>{`
        @keyframes scoutFadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Scout avatar / brand mark */}
      <div className="flex flex-col items-center gap-4">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 ring-4 ring-primary/20">
          <Sparkles className="h-10 w-10 text-primary" strokeWidth={1.5} />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            Hi, I&apos;m Scout 👋
          </h1>
          <p className="text-base text-muted-foreground max-w-sm">
            Let&apos;s set up your search so I can start finding the right jobs
            for you — automatically.
          </p>
        </div>
      </div>

      {/* What you'll need */}
      <div className="w-full rounded-2xl border bg-muted/50 p-5 text-left space-y-4 shadow-scout">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Here&apos;s what we&apos;ll need
        </p>
        <ul className="space-y-3">
          {THINGS_WE_NEED.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Icon className="h-4 w-4 text-primary" strokeWidth={2} />
              </span>
              <span className="text-sm font-medium text-foreground">{text}</span>
            </li>
          ))}
        </ul>
      </div>

      <Button
        size="lg"
        className="w-full rounded-full text-base font-bold shadow-scout"
        onClick={onNext}
      >
        Let&apos;s go!
      </Button>
    </div>
  );
}
