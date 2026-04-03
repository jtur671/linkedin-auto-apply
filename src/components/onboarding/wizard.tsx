"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ProgressBar } from "@/components/onboarding/progress-bar";
import { StepWelcome } from "@/components/onboarding/step-welcome";
import { StepCredentials } from "@/components/onboarding/step-credentials";
import { StepJobSearch } from "@/components/onboarding/step-job-search";
import { StepProfile } from "@/components/onboarding/step-profile";
import { StepAISetup } from "@/components/onboarding/step-ai-setup";

export function OnboardingWizard() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [email, setEmail] = useState("");

  function handleCredentialsNext(savedEmail: string) {
    setEmail(savedEmail);
    setCurrentStep(2);
  }

  async function handleComplete() {
    router.push("/");
  }

  return (
    <div className="flex min-h-screen items-start justify-center bg-background pt-12 pb-12 px-4">
      <div className="w-full max-w-2xl">
        <ProgressBar currentStep={currentStep} />

        <div className="rounded-xl border bg-card p-6 shadow-sm">
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
        </div>
      </div>
    </div>
  );
}
