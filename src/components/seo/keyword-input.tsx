"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Loader2, X } from "lucide-react";

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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Target Keywords
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Enter the job titles, skills, and keywords you want to rank for in recruiter searches.
        </p>
        <div className="flex gap-2">
          <Input
            placeholder="e.g. QA Automation, Playwright, CI/CD"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
          />
          <Button variant="outline" onClick={addKeywords} disabled={loading || !input.trim()}>
            Add
          </Button>
        </div>

        {keywords.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {keywords.map((keyword) => (
              <span
                key={keyword}
                className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary"
              >
                {keyword}
                <button
                  onClick={() => removeKeyword(keyword)}
                  className="ml-1 rounded-full hover:bg-primary/20 p-0.5"
                  disabled={loading}
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
          className="w-full bg-green-600 hover:bg-green-700 text-white"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Auditing Profile...
            </>
          ) : (
            <>
              <Search className="h-4 w-4 mr-2" />
              Audit My Profile
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
