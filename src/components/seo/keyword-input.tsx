"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Loader2, X, Tag } from "lucide-react";

interface KeywordInputProps {
  onAudit: (keywords: string[]) => void;
  loading: boolean;
  defaultKeywords?: string[];
}

export function KeywordInput({ onAudit, loading, defaultKeywords = [] }: KeywordInputProps) {
  const [input, setInput] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);

  useEffect(() => {
    if (defaultKeywords.length > 0 && keywords.length === 0) {
      setKeywords(defaultKeywords);
    }
  }, [defaultKeywords]);

  function addKeywords() {
    const newKeywords = input
      .split(",")
      .map((k) => k.trim())
      .filter((k) => k && !keywords.includes(k));
    if (newKeywords.length > 0) {
      setKeywords([...keywords, ...newKeywords]);
      setInput("");
    }
  }

  function removeKeyword(keyword: string) {
    setKeywords(keywords.filter((k) => k !== keyword));
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      addKeywords();
    }
  }

  return (
    <Card className="rounded-2xl shadow-scout border-border/60">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-bold">
          <Tag className="h-4 w-4 text-primary" />
          What roles are you targeting?
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Add the job titles and skills you want recruiters to find you for — we&apos;ll check how well your profile matches.
        </p>
        <div className="flex gap-2">
          <Input
            placeholder="e.g. QA Automation, Playwright, CI/CD"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            className="rounded-xl focus-visible:ring-primary"
          />
          <Button
            variant="outline"
            onClick={addKeywords}
            disabled={loading || !input.trim()}
            className="rounded-xl border-primary/40 text-primary hover:bg-primary/10"
          >
            Add
          </Button>
        </div>

        {keywords.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {keywords.map((keyword) => (
              <span
                key={keyword}
                className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary"
              >
                {keyword}
                <button
                  onClick={() => removeKeyword(keyword)}
                  className="ml-1 rounded-full p-0.5 hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  disabled={loading}
                  aria-label={`Remove ${keyword}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        <Button
          onClick={() => onAudit(keywords)}
          disabled={loading || keywords.length === 0}
          className="w-full rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-bold shadow-scout focus-visible:ring-2 focus-visible:ring-ring"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Checking your profile…
            </>
          ) : (
            <>
              <Search className="h-4 w-4 mr-2" />
              Check my profile
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
