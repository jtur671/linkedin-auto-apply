import { NextResponse } from "next/server";
import { checkOnboardingNeeded } from "@/lib/onboarding";

export async function GET() {
  const needsOnboarding = await checkOnboardingNeeded();
  return NextResponse.json({ needsOnboarding });
}
