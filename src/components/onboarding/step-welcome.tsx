"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";

interface StepWelcomeProps {
  onNext: () => void;
}

const REQUIREMENTS = [
  "LinkedIn account credentials",
  "5 minutes to set up",
  "Job titles you're interested in",
];

export function StepWelcome({ onNext }: StepWelcomeProps) {
  return (
    <div className="flex flex-col items-center text-center gap-6">
      <div className="space-y-3">
        <h1 className="text-4xl font-bold tracking-tight">LinkedIn Auto Apply</h1>
        <p className="text-lg text-muted-foreground max-w-md">
          Automatically apply to hundreds of Easy Apply jobs on LinkedIn while you sleep.
        </p>
      </div>

      <Card className="w-full text-left">
        <CardContent className="pt-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">
            What you&apos;ll need
          </h2>
          <ul className="space-y-3">
            {REQUIREMENTS.map((req) => (
              <li key={req} className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                <span className="text-sm">{req}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Button size="lg" className="w-full" onClick={onNext}>
        Get Started
      </Button>
    </div>
  );
}
