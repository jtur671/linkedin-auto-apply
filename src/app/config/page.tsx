"use client";
import { useEffect, useState, useCallback } from "react";
import { CredentialsForm } from "@/components/config/credentials-form";
import { SearchConfigForm } from "@/components/config/search-config-form";
import { ProfileAnswersForm } from "@/components/config/profile-answers-form";
import { AIProviderForm } from "@/components/config/ai-provider-form";

export default function ConfigPage() {
  const [session, setSession] = useState<any>(null);
  const [configs, setConfigs] = useState<any[]>([]);
  const [answers, setAnswers] = useState<any[]>([]);

  const fetchAll = useCallback(() => {
    fetch("/api/session").then(r => r.json()).then(setSession);
    fetch("/api/config").then(r => r.json()).then(d => setConfigs(d.configs));
    fetch("/api/config/profile-answers").then(r => r.json()).then(d => setAnswers(d.answers));
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  if (!session) return <div className="space-y-6"><h2 className="text-3xl font-bold">Configuration</h2><p className="text-muted-foreground">Loading...</p></div>;

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">Configuration</h2>
      <CredentialsForm session={session} onRefresh={fetchAll} />
      <AIProviderForm onRefresh={fetchAll} />
      <SearchConfigForm configs={configs} onRefresh={fetchAll} />
      <ProfileAnswersForm answers={answers} onRefresh={fetchAll} />
    </div>
  );
}
