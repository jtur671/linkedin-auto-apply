"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface StepProfileProps {
  onComplete: () => void;
  onBack: () => void;
  email?: string;
}

type RadioValue = "Yes" | "No" | "";

interface ProfileState {
  phone: string;
  email: string;
  website: string;
  linkedin: string;
  github: string;
  yearsExperience: string;
  yearsSpecialty: string;
  workAuth: RadioValue;
  visaSponsorship: RadioValue;
  backgroundCheck: RadioValue;
  drugTest: RadioValue;
  commute: RadioValue;
  w2Contract: RadioValue;
}

function RadioGroup({
  label,
  value,
  onChange,
}: {
  label: string;
  value: RadioValue;
  onChange: (v: RadioValue) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm">{label}</span>
      <div className="flex gap-2">
        {(["Yes", "No"] as const).map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(value === opt ? "" : opt)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium border transition-colors",
              value === opt
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
            )}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

export function StepProfile({ onComplete, onBack, email: initialEmail = "" }: StepProfileProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<ProfileState>({
    phone: "",
    email: initialEmail,
    website: "",
    linkedin: "",
    github: "",
    yearsExperience: "",
    yearsSpecialty: "",
    workAuth: "",
    visaSponsorship: "",
    backgroundCheck: "",
    drugTest: "",
    commute: "",
    w2Contract: "",
  });

  function update<K extends keyof ProfileState>(key: K, value: ProfileState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit() {
    setError(null);
    setLoading(true);

    const entries: Array<{ fieldLabel: string; fieldType: string; answer: string }> = [
      { fieldLabel: "Phone number", fieldType: "text", answer: form.phone },
      { fieldLabel: "Email address", fieldType: "text", answer: form.email },
      { fieldLabel: "Website", fieldType: "text", answer: form.website },
      { fieldLabel: "LinkedIn profile", fieldType: "text", answer: form.linkedin },
      { fieldLabel: "GitHub", fieldType: "text", answer: form.github },
      { fieldLabel: "Years of experience", fieldType: "select", answer: form.yearsExperience },
      { fieldLabel: "Years in current specialty", fieldType: "select", answer: form.yearsSpecialty },
      { fieldLabel: "Work authorization", fieldType: "radio", answer: form.workAuth },
      { fieldLabel: "Visa sponsorship", fieldType: "radio", answer: form.visaSponsorship },
      { fieldLabel: "background check", fieldType: "radio", answer: form.backgroundCheck },
      { fieldLabel: "drug test", fieldType: "radio", answer: form.drugTest },
      { fieldLabel: "commute", fieldType: "radio", answer: form.commute },
      { fieldLabel: "W2", fieldType: "radio", answer: form.w2Contract },
    ].filter((e) => e.answer !== "");

    try {
      await Promise.all(
        entries.map((entry) =>
          fetch("/api/config/profile-answers", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(entry),
          })
        )
      );
      onComplete();
    } catch {
      setError("Failed to save profile answers. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold">Set Up Your Profile Answers</h2>
        <p className="text-muted-foreground text-sm">
          These answers auto-fill Easy Apply forms so you don&apos;t have to.
        </p>
      </div>

      {/* Contact Info */}
      <section className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Contact Info
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="phone">Phone number</Label>
            <Input
              id="phone"
              placeholder="+1 (555) 000-0000"
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* Online Profiles */}
      <section className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Online Profiles
        </h3>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="website">Website / Portfolio URL</Label>
            <Input
              id="website"
              placeholder="https://yoursite.com"
              value={form.website}
              onChange={(e) => update("website", e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="linkedin">LinkedIn URL</Label>
            <Input
              id="linkedin"
              placeholder="https://linkedin.com/in/yourname"
              value={form.linkedin}
              onChange={(e) => update("linkedin", e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="github">GitHub URL</Label>
            <Input
              id="github"
              placeholder="https://github.com/yourname"
              value={form.github}
              onChange={(e) => update("github", e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* Experience */}
      <section className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Experience
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="yearsExp">Years of experience</Label>
            <Input
              id="yearsExp"
              type="number"
              min={0}
              placeholder="e.g. 5"
              value={form.yearsExperience}
              onChange={(e) => update("yearsExperience", e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="yearsSpec">Years in current specialty</Label>
            <Input
              id="yearsSpec"
              type="number"
              min={0}
              placeholder="e.g. 3"
              value={form.yearsSpecialty}
              onChange={(e) => update("yearsSpecialty", e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* Work Authorization */}
      <section className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Work Authorization
        </h3>
        <div className="space-y-3">
          <RadioGroup
            label="Authorized to work in the US?"
            value={form.workAuth}
            onChange={(v) => update("workAuth", v)}
          />
          <RadioGroup
            label="Require visa sponsorship?"
            value={form.visaSponsorship}
            onChange={(v) => update("visaSponsorship", v)}
          />
        </div>
      </section>

      {/* Willingness */}
      <section className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Willingness
        </h3>
        <div className="space-y-3">
          <RadioGroup
            label="Background check"
            value={form.backgroundCheck}
            onChange={(v) => update("backgroundCheck", v)}
          />
          <RadioGroup
            label="Drug test"
            value={form.drugTest}
            onChange={(v) => update("drugTest", v)}
          />
          <RadioGroup
            label="Willing to commute"
            value={form.commute}
            onChange={(v) => update("commute", v)}
          />
          <RadioGroup
            label="Open to W2 contract"
            value={form.w2Contract}
            onChange={(v) => update("w2Contract", v)}
          />
        </div>
      </section>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" className="flex-1" onClick={onBack} disabled={loading}>
          Back
        </Button>
        <Button className="flex-1" onClick={handleSubmit} disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {loading ? "Saving..." : "Finish Setup"}
        </Button>
      </div>
    </div>
  );
}
