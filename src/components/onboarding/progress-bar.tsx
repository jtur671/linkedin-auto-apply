"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = ["Welcome", "LinkedIn", "Job Search", "Profile"];

interface ProgressBarProps {
  currentStep: number;
}

export function ProgressBar({ currentStep }: ProgressBarProps) {
  return (
    <div className="flex items-center justify-center w-full mb-8">
      {STEPS.map((label, index) => {
        const isCompleted = index < currentStep;
        const isCurrent = index === currentStep;
        const isFuture = index > currentStep;

        return (
          <div key={label} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors",
                  isCompleted && "border-primary bg-primary text-primary-foreground",
                  isCurrent && "border-primary bg-background text-primary",
                  isFuture && "border-muted-foreground/30 bg-background text-muted-foreground/50"
                )}
              >
                {isCompleted ? <Check className="h-4 w-4" /> : <span>{index + 1}</span>}
              </div>
              <span
                className={cn(
                  "text-xs font-medium",
                  isCompleted && "text-primary",
                  isCurrent && "text-foreground",
                  isFuture && "text-muted-foreground/50"
                )}
              >
                {label}
              </span>
            </div>
            {index < STEPS.length - 1 && (
              <div
                className={cn(
                  "mx-2 mb-5 h-0.5 w-16",
                  index < currentStep ? "bg-primary" : "bg-muted-foreground/20"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
