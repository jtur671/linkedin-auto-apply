"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  "Welcome",
  "Your LinkedIn login",
  "What you're looking for",
  "Questions employers ask",
  "AI setup",
];

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
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-bold transition-all duration-200",
                  isCompleted &&
                    "border-primary bg-primary text-primary-foreground shadow-scout",
                  isCurrent &&
                    "border-primary bg-primary/10 text-primary ring-4 ring-primary/20",
                  isFuture &&
                    "border-border bg-background text-muted-foreground/40"
                )}
              >
                {isCompleted ? (
                  <Check className="h-4 w-4" strokeWidth={3} />
                ) : (
                  <span>{index + 1}</span>
                )}
              </div>
              <span
                className={cn(
                  "text-xs font-semibold max-w-[72px] text-center leading-tight",
                  isCompleted && "text-primary",
                  isCurrent && "text-foreground",
                  isFuture && "text-muted-foreground/40"
                )}
              >
                {label}
              </span>
            </div>
            {index < STEPS.length - 1 && (
              <div
                className={cn(
                  "mx-1.5 mb-6 h-0.5 w-10 rounded-full transition-colors duration-300",
                  index < currentStep ? "bg-primary" : "bg-border"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
