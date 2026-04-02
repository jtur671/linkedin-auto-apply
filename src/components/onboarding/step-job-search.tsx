"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Plus, Loader2 } from "lucide-react";

interface StepJobSearchProps {
  onNext: () => void;
  onBack: () => void;
}

const JOB_CATEGORIES = [
  {
    label: "QA & Testing",
    titles: [
      "QA Engineer",
      "Quality Assurance Engineer",
      "Test Automation Engineer",
      "SDET",
      "Software Test Engineer",
      "QA Lead",
      "QA Analyst",
      "QA Manager",
      "Test Architect",
      "Performance Test Engineer",
      "Manual QA Engineer",
      "Automation Engineer",
    ],
  },
  {
    label: "Software Engineering",
    titles: [
      "Software Engineer",
      "Full Stack Developer",
      "Backend Developer",
      "Frontend Developer",
      "React Developer",
      "Node.js Developer",
      "Python Developer",
      "Java Developer",
      ".NET Developer",
      "DevOps Engineer",
      "Cloud Engineer",
      "Site Reliability Engineer",
    ],
  },
  {
    label: "Data & AI",
    titles: [
      "Data Engineer",
      "Data Analyst",
      "Data Scientist",
      "ML Engineer",
      "AI Engineer",
      "Prompt Engineer",
      "Business Intelligence Analyst",
      "Analytics Engineer",
    ],
  },
  {
    label: "Product & Design",
    titles: [
      "Product Manager",
      "Product Designer",
      "UX Designer",
      "UI Designer",
      "UX Researcher",
      "Scrum Master",
      "Project Manager",
    ],
  },
  {
    label: "Cybersecurity",
    titles: [
      "Security Engineer",
      "Security Analyst",
      "Penetration Tester",
      "SOC Analyst",
      "GRC Analyst",
      "Cloud Security Engineer",
    ],
  },
  {
    label: "IT & Support",
    titles: [
      "Systems Administrator",
      "Network Engineer",
      "IT Support",
      "Help Desk",
      "Database Administrator",
      "Cloud Administrator",
    ],
  },
  {
    label: "Mobile",
    titles: [
      "iOS Developer",
      "Android Developer",
      "Mobile Engineer",
      "Flutter Developer",
      "React Native Developer",
    ],
  },
];

export function StepJobSearch({ onNext, onBack }: StepJobSearchProps) {
  const [activeCategory, setActiveCategory] = useState(0);
  const [selectedTitles, setSelectedTitles] = useState<Set<string>>(new Set());
  const [customTitle, setCustomTitle] = useState("");
  const [location, setLocation] = useState("");
  const [remote, setRemote] = useState("any");
  const [experience, setExperience] = useState("senior");
  const [datePosted, setDatePosted] = useState("past_week");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleTitle(title: string) {
    setSelectedTitles((prev) => {
      const next = new Set(prev);
      if (next.has(title)) {
        next.delete(title);
      } else {
        next.add(title);
      }
      return next;
    });
  }

  function addCustomTitle() {
    const trimmed = customTitle.trim();
    if (!trimmed) return;
    setSelectedTitles((prev) => new Set(prev).add(trimmed));
    setCustomTitle("");
  }

  async function handleSubmit() {
    if (selectedTitles.size === 0) {
      setError("Please select at least one job title.");
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const titlesArray = Array.from(selectedTitles);
      await Promise.all(
        titlesArray.map((title) =>
          fetch("/api/config", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              keywords: title,
              location,
              remotePreference: remote,
              experienceLevel: experience,
              datePosted,
            }),
          })
        )
      );
      onNext();
    } catch {
      setError("Failed to save job search config. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold">What roles are you looking for?</h2>
        <p className="text-muted-foreground text-sm">
          Select all job titles you want to apply for.
        </p>
      </div>

      {/* Category tabs */}
      <div className="flex flex-wrap gap-2">
        {JOB_CATEGORIES.map((cat, i) => (
          <button
            key={cat.label}
            onClick={() => setActiveCategory(i)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium border transition-colors",
              activeCategory === i
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Job titles for active category */}
      <div className="flex flex-wrap gap-2">
        {JOB_CATEGORIES[activeCategory].titles.map((title) => {
          const isSelected = selectedTitles.has(title);
          return (
            <Badge
              key={title}
              variant={isSelected ? "default" : "outline"}
              className={cn(
                "cursor-pointer select-none text-xs py-1 px-3 transition-colors",
                isSelected
                  ? "bg-primary text-primary-foreground hover:bg-primary/80"
                  : "hover:border-primary/50 hover:text-foreground"
              )}
              onClick={() => toggleTitle(title)}
            >
              {title}
            </Badge>
          );
        })}
      </div>

      {/* Custom title input */}
      <div className="flex gap-2">
        <Input
          placeholder="Add custom job title..."
          value={customTitle}
          onChange={(e) => setCustomTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustomTitle())}
        />
        <Button type="button" variant="outline" size="icon" onClick={addCustomTitle}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Selected count */}
      {selectedTitles.size > 0 && (
        <p className="text-sm text-primary font-medium">
          {selectedTitles.size} job title{selectedTitles.size !== 1 ? "s" : ""} selected
        </p>
      )}

      {/* Filters */}
      <div className="space-y-4 border-t pt-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Search Filters
        </h3>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              placeholder="e.g. New York, Remote"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Remote preference</Label>
            <Select value={remote} onValueChange={(v) => { if (v !== null) setRemote(v); }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any</SelectItem>
                <SelectItem value="remote">Remote</SelectItem>
                <SelectItem value="hybrid">Hybrid</SelectItem>
                <SelectItem value="onsite">On-site</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Experience level</Label>
            <Select value={experience} onValueChange={(v) => { if (v !== null) setExperience(v); }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="entry">Entry</SelectItem>
                <SelectItem value="mid">Mid</SelectItem>
                <SelectItem value="senior">Senior</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Date posted</Label>
            <Select value={datePosted} onValueChange={(v) => { if (v !== null) setDatePosted(v); }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="past_24_hours">Past 24h</SelectItem>
                <SelectItem value="past_week">Past week</SelectItem>
                <SelectItem value="past_month">Past month</SelectItem>
                <SelectItem value="any">Any time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" className="flex-1" onClick={onBack} disabled={loading}>
          Back
        </Button>
        <Button className="flex-1" onClick={handleSubmit} disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {loading ? "Saving..." : "Continue"}
        </Button>
      </div>
    </div>
  );
}
