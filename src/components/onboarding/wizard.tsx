"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ProgressBar } from "@/components/onboarding/progress-bar";
import { StepWelcome } from "@/components/onboarding/step-welcome";
import { StepCredentials } from "@/components/onboarding/step-credentials";
import { StepJobSearch } from "@/components/onboarding/step-job-search";
import { StepProfile } from "@/components/onboarding/step-profile";
import { StepAISetup } from "@/components/onboarding/step-ai-setup";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

/** Finish screen — shown after step 4 completes. */
function FinishScreen({ onDone }: { onDone: () => void }) {
  return (
    <div
      className="flex flex-col items-center text-center gap-8 py-4"
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

      <div className="flex flex-col items-center gap-4">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 ring-4 ring-primary/20">
          <Sparkles className="h-10 w-10 text-primary" strokeWidth={1.5} />
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground">
            All set! 🎉
          </h2>
          <p className="text-base text-muted-foreground max-w-sm">
            I&apos;ll start finding your picks. Head to Home to see what Scout
            turns up.
          </p>
        </div>
      </div>

      <Button
        size="lg"
        className="w-full rounded-full font-bold shadow-scout"
        onClick={onDone}
      >
        Go to Home
      </Button>
    </div>
  );
}

export function OnboardingWizard() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);

  function handleCredentialsNext(savedEmail: string) {
    setEmail(savedEmail);
    setCurrentStep(2);
  }

  async function handleComplete() {
    setDone(true);
  }

  function handleDone() {
    router.push("/");
  }

  return (
    <div className="flex min-h-screen items-start justify-center bg-background pt-10 pb-12 px-4">
      <div className="w-full max-w-2xl">
        {!done && <ProgressBar currentStep={currentStep} />}

        <div className="rounded-2xl border bg-card p-7 shadow-scout">
          {done ? (
            <FinishScreen onDone={handleDone} />
          ) : (
            <>
              {currentStep === 0 && (
                <StepWelcome onNext={() => setCurrentStep(1)} />
              )}
              {currentStep === 1 && (
                <StepCredentials
                  onNext={handleCredentialsNext}
                  onBack={() => setCurrentStep(0)}
                />
              )}
              {currentStep === 2 && (
                <StepJobSearch
                  onNext={() => setCurrentStep(3)}
                  onBack={() => setCurrentStep(1)}
                />
              )}
              {currentStep === 3 && (
                <StepProfile
                  onComplete={() => setCurrentStep(4)}
                  onBack={() => setCurrentStep(2)}
                  email={email}
                />
              )}
              {currentStep === 4 && (
                <StepAISetup
                  onNext={handleComplete}
                  onBack={() => setCurrentStep(3)}
                  onSkip={handleComplete}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
