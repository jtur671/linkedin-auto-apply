"use client";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Trash2 } from "lucide-react";

interface SearchConfig { id: number; keywords: string; location: string; remotePreference: string; experienceLevel: string; datePosted: string; isActive: boolean; }

export function SearchConfigForm({ configs, onRefresh }: { configs: SearchConfig[]; onRefresh: () => void }) {
  const [keywords, setKeywords] = useState("");
  const [location, setLocation] = useState("");
  const [remotePreference, setRemotePreference] = useState("any");
  const [experienceLevel, setExperienceLevel] = useState("senior");
  const [datePosted, setDatePosted] = useState("past_24_hours");
  const [loading, setLoading] = useState(false);

  async function handleAdd() {
    if (!keywords.trim()) return;
    setLoading(true);
    await fetch("/api/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keywords, location, remotePreference, experienceLevel, datePosted }),
    });
    setKeywords("");
    setLocation("");
    setLoading(false);
    onRefresh();
  }

  async function handleDelete(id: number) {
    await fetch(`/api/config?id=${id}`, { method: "DELETE" });
    onRefresh();
  }

  return (
    <Card>
      <CardHeader><CardTitle>Search Configurations</CardTitle></CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Keywords</Label>
              <Input placeholder="e.g. Software Engineer" value={keywords} onChange={e => setKeywords(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Input placeholder="e.g. San Francisco, CA" value={location} onChange={e => setLocation(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Remote</Label>
              <Select value={remotePreference} onValueChange={(v) => { if (v !== null) setRemotePreference(v); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  <SelectItem value="remote">Remote</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                  <SelectItem value="onsite">On-site</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Experience</Label>
              <Select value={experienceLevel} onValueChange={(v) => { if (v !== null) setExperienceLevel(v); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="entry">Entry</SelectItem>
                  <SelectItem value="mid">Mid</SelectItem>
                  <SelectItem value="senior">Senior</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Date Posted</Label>
              <Select value={datePosted} onValueChange={(v) => { if (v !== null) setDatePosted(v); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="past_24_hours">Past 24 hours</SelectItem>
                  <SelectItem value="past_week">Past week</SelectItem>
                  <SelectItem value="past_month">Past month</SelectItem>
                  <SelectItem value="any">Any time</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={handleAdd} disabled={loading || !keywords.trim()}>Add Search Config</Button>
        </div>
        {configs.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              {configs.map(config => (
                <div key={config.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium">{config.keywords}</div>
                    <div className="text-xs text-muted-foreground">{config.location || "Any location"} &bull; {config.remotePreference} &bull; {config.experienceLevel} &bull; {config.datePosted}</div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(config.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
