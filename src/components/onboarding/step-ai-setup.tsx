"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, CheckCircle, XCircle, ArrowLeft, SkipForward } from "lucide-react";

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
  const [testResult, setTestResult] = useState<{ success: boolean; error?: string } | null>(null);

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
      setTestResult({ success: data.testResult?.success ?? false, error: data.testResult?.error });
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
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold">AI Provider Setup</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Connect an AI provider to power the Profile SEO audit. You can skip this and set it up later in Configuration.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-1.5 block">Provider</label>
          <select
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            value={provider}
            onChange={(e) => { setProvider(e.target.value); setTestResult(null); }}
          >
            <option value="openai">OpenAI (GPT-5.4 Nano)</option>
            <option value="google">Google Gemini (3 Flash)</option>
          </select>
        </div>

        <div>
          <label className="text-sm font-medium mb-1.5 block">API Key</label>
          <Input
            type="password"
            placeholder={provider === "openai" ? "sk-..." : "AIza..."}
            value={apiKey}
            onChange={(e) => { setApiKey(e.target.value); setTestResult(null); }}
          />
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleTest}
            disabled={testing || !apiKey.trim()}
          >
            {testing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Test Connection
          </Button>
          {testResult && (
            <div className={`flex items-center gap-1.5 text-sm ${testResult.success ? "text-green-400" : "text-red-400"}`}>
              {testResult.success ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
              {testResult.success ? "Connected" : testResult.error || "Failed"}
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-between pt-4 border-t">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onSkip}>
            <SkipForward className="h-4 w-4 mr-2" />
            Skip for Now
          </Button>
          <Button onClick={handleSave} disabled={saving || !apiKey.trim()}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Save & Finish
          </Button>
        </div>
      </div>
    </div>
  );
}
