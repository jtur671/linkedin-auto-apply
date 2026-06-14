"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, CheckCircle, XCircle, ArrowLeft, Sparkles } from "lucide-react";

interface StepAISetupProps {
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

export function StepAISetup({ onNext, onBack, onSkip }: StepAISetupProps) {
  const [provider, setProvider] = useState("openai");
  const [apiKey, setApiKey] = useState("");
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    error?: string;
  } | null>(null);

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/config/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, apiKey, test: true }),
      });
      const data = await res.json();
      setTestResult({
        success: data.testResult?.success ?? false,
        error: data.testResult?.error,
      });
    } catch {
      setTestResult({ success: false, error: "Connection failed" });
    } finally {
      setTesting(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      await fetch("/api/config/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, apiKey }),
      });
      onNext();
    } catch {
      // continue anyway
      onNext();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-extrabold tracking-tight text-foreground">
          AI setup{" "}
          <span className="text-base font-semibold text-muted-foreground">
            (optional)
          </span>
        </h2>
        <p className="text-sm text-muted-foreground">
          Connect an AI provider to unlock Scout&apos;s Profile SEO audit. You
          can always do this later in Settings.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium block">Provider</label>
          <select
            className="w-full rounded-xl border bg-background px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
            value={provider}
            onChange={(e) => {
              setProvider(e.target.value);
              setTestResult(null);
            }}
          >
            <option value="openai">OpenAI (GPT-5.4 Nano)</option>
            <option value="google">Google Gemini (3 Flash)</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium block">API Key</label>
          <Input
            type="password"
            placeholder={provider === "openai" ? "sk-…" : "AIza…"}
            value={apiKey}
            onChange={(e) => {
              setApiKey(e.target.value);
              setTestResult(null);
            }}
            className="rounded-xl"
          />
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={handleTest}
            disabled={testing || !apiKey.trim()}
            className="rounded-full"
          >
            {testing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2 text-primary" />
            )}
            Test connection
          </Button>
          {testResult && (
            <div
              className={`flex items-center gap-1.5 text-sm font-medium ${
                testResult.success ? "text-primary" : "text-destructive"
              }`}
            >
              {testResult.success ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              {testResult.success
                ? "Connected!"
                : testResult.error || "Failed"}
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-between gap-3 pt-4 border-t border-border">
        <Button
          variant="outline"
          onClick={onBack}
          className="rounded-full"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            onClick={onSkip}
            className="rounded-full text-muted-foreground hover:text-foreground"
          >
            Skip for now
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !apiKey.trim()}
            className="rounded-full font-bold shadow-scout"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : null}
            Save &amp; finish
          </Button>
        </div>
      </div>
    </div>
  );
}
