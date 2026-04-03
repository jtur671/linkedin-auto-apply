"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Loader2, Circle } from "lucide-react";

const STEPS = [
  { label: "Launching headless browser", duration: 3000 },
  { label: "Loading your LinkedIn profile", duration: 5000 },
  { label: "Scraping headline, about, featured", duration: 4000 },
  { label: "Loading experience details page", duration: 5000 },
  { label: "Loading education & skills pages", duration: 5000 },
  { label: "Loading certifications, projects, courses", duration: 6000 },
  { label: "Expanding truncated descriptions", duration: 3000 },
  { label: "Sending full profile to AI", duration: 12000 },
  { label: "Scoring sections & finding keyword gaps", duration: 15000 },
  { label: "Generating report", duration: 10000 },
];

export function AuditProgress() {
  const [activeStep, setActiveStep] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const timer = setInterval(() => {
      const ms = Date.now() - start;
      setElapsed(ms);

      let cumulative = 0;
      for (let i = 0; i < STEPS.length; i++) {
        cumulative += STEPS[i].duration;
        if (ms < cumulative) {
          setActiveStep(i);
          return;
        }
      }
      setActiveStep(STEPS.length - 1);
    }, 200);

    return () => clearInterval(timer);
  }, []);

  const totalDuration = STEPS.reduce((sum, s) => sum + s.duration, 0);
  const progressPercent = Math.min((elapsed / totalDuration) * 100, 95);

  return (
    <Card className="overflow-hidden">
      <div
        className="h-1 bg-green-500 transition-all duration-500 ease-out"
        style={{ width: `${progressPercent}%` }}
      />
      <CardContent className="pt-5 pb-5">
        <div className="space-y-2.5">
          {STEPS.map((step, i) => {
            const isComplete = i < activeStep;
            const isActive = i === activeStep;
            const isFuture = i > activeStep;

            return (
              <div
                key={i}
                className={`flex items-center gap-3 text-sm transition-all duration-300 ${
                  isFuture ? "opacity-30" : "opacity-100"
                }`}
              >
                {isComplete ? (
                  <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" />
                ) : isActive ? (
                  <Loader2 className="h-4 w-4 text-green-400 animate-spin flex-shrink-0" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground/30 flex-shrink-0" />
                )}
                <span
                  className={
                    isActive
                      ? "text-foreground font-medium"
                      : isComplete
                        ? "text-muted-foreground"
                        : "text-muted-foreground/50"
                  }
                >
                  {step.label}
                  {isActive && (
                    <span className="inline-flex ml-1.5">
                      <span className="animate-pulse">.</span>
                      <span className="animate-pulse" style={{ animationDelay: "200ms" }}>.</span>
                      <span className="animate-pulse" style={{ animationDelay: "400ms" }}>.</span>
                    </span>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
