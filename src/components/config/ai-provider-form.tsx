"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

interface AIProviderFormProps {
  onRefresh: () => void;
}

type TestStatus =
  | { type: "idle" }
  | { type: "loading" }
  | { type: "success" }
  | { type: "error"; message: string };

export function AIProviderForm({ onRefresh }: AIProviderFormProps) {
  const [provider, setProvider] = useState("openai");
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [testStatus, setTestStatus] = useState<TestStatus>({ type: "idle" });
  const [saveMessage, setSaveMessage] = useState("");

  useEffect(() => {
    fetch("/api/config/ai")
      .then((res) => res.json())
      .then((data) => {
        if (data.provider) setProvider(data.provider);
      })
      .catch(() => {});
  }, []);

  async function handleTest() {
    if (!apiKey) {
      setTestStatus({ type: "error", message: "Please enter an API key" });
      return;
    }

    setTestStatus({ type: "loading" });
    try {
      const res = await fetch("/api/config/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, apiKey, test: true }),
      });
      const data = await res.json();

      if (!res.ok) {
        setTestStatus({
          type: "error",
          message: data.error ?? "Request failed",
        });
        return;
      }

      if (data.test?.success) {
        setTestStatus({ type: "success" });
      } else {
        setTestStatus({
          type: "error",
          message: data.test?.error ?? "Connection test failed",
        });
      }
    } catch (err) {
      setTestStatus({
        type: "error",
        message: err instanceof Error ? err.message : "Network error",
      });
    }
  }

  async function handleSave() {
    if (!apiKey) {
      setSaveMessage("Please enter an API key");
      return;
    }

    setSaving(true);
    setSaveMessage("");
    try {
      const res = await fetch("/api/config/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, apiKey }),
      });

      if (res.ok) {
        setSaveMessage("Saved");
        onRefresh();
      } else {
        const data = await res.json();
        setSaveMessage(data.error ?? "Failed to save");
      }
    } catch {
      setSaveMessage("Network error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Provider</CardTitle>
        <CardDescription>
          Configure the AI provider used for profile SEO analysis.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="ai-provider">Provider</Label>
          <Select value={provider} onValueChange={(v) => { if (v) setProvider(v); }}>
            <SelectTrigger className="w-full" id="ai-provider">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="openai">OpenAI</SelectItem>
              <SelectItem value="google">Google Gemini</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="ai-api-key">API Key</Label>
          <Input
            id="ai-api-key"
            type="password"
            placeholder="sk-... or AIza..."
            value={apiKey}
            onChange={(e) => {
              setApiKey(e.target.value);
              setTestStatus({ type: "idle" });
              setSaveMessage("");
            }}
          />
        </div>

        {testStatus.type === "success" && (
          <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
            <CheckCircle2 className="size-4" />
            Connection successful
          </div>
        )}

        {testStatus.type === "error" && (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <XCircle className="size-4" />
            {testStatus.message}
          </div>
        )}

        {saveMessage && testStatus.type !== "error" && (
          <p className="text-sm text-muted-foreground">{saveMessage}</p>
        )}

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleTest}
            disabled={testStatus.type === "loading"}
          >
            {testStatus.type === "loading" && (
              <Loader2 className="animate-spin" />
            )}
            Test Connection
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="animate-spin" />}
            Save
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
