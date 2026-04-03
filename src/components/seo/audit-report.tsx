"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SectionCard } from "./section-card";
import type { AuditResult, ProfileData } from "@/lib/seo/types";

interface AuditReportProps {
  audit: AuditResult;
  profileData: ProfileData;
  keywords: string[];
}

function getOverallColor(score: number) {
  if (score >= 75) return "text-green-400";
  if (score >= 50) return "text-yellow-400";
  return "text-red-400";
}

function getSectionContent(section: string, profile: ProfileData): string {
  const s = section.toLowerCase();
  if (s === "headline") return profile.headline;
  if (s === "about") return profile.about;
  if (s === "skills") {
    // Try to get full skills from the detail page text first
    if (profile.rawProfileText) {
      const lines = profile.rawProfileText.split("\n");
      const skillsIdx = lines.findIndex((l) => l.trim() === "--- Skills ---");
      if (skillsIdx >= 0) {
        const skillLines: string[] = [];
        for (let i = skillsIdx + 1; i < lines.length && i < skillsIdx + 100; i++) {
          const line = lines[i].trim();
          if (line.startsWith("---") && line.endsWith("---")) break;
          // Filter out noise: nav items, project names repeated, empty lines
          if (!line || line.length < 2 || line === "Load more" || line.includes("notifications") || line === "Skip to main content") continue;
          if (["Home", "My Network", "Jobs", "Messaging", "Notifications", "Me", "For Business", "All", "Industry Knowledge", "Tools & Technologies", "Interpersonal Skills", "Other Skills", "Resources", "Enhance profile", "Add section", "Open to", "Who your viewers also viewed", "Private to you", "View", "About"].includes(line)) continue;
          if (line.startsWith("Reactivate") || line.startsWith("jason-tur") || line.startsWith("Jason Tur")) continue;
          skillLines.push(line);
        }
        // Deduplicate and filter out project associations
        const uniqueSkills = [...new Set(skillLines)].filter((s) => s.length < 40);
        if (uniqueSkills.length > 0) return uniqueSkills.join(", ");
      }
    }
    return profile.topSkills.join(", ");
  }
  if (s === "experience") return profile.experience.map((e) => `${e.title} at ${e.company}: ${e.description}`).join("\n\n");

  // For other sections (education, certifications, projects, courses, etc.)
  // extract from rawProfileText by finding the section header
  if (profile.rawProfileText) {
    const lines = profile.rawProfileText.split("\n");
    const sectionIdx = lines.findIndex((l) => l.trim().toLowerCase() === s);
    if (sectionIdx >= 0) {
      const sectionLines: string[] = [];
      for (let i = sectionIdx + 1; i < lines.length && i < sectionIdx + 30; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        // Stop if we hit another section header (short line that matches a known section name)
        if (["experience", "education", "skills", "projects", "courses", "certifications", "organizations", "languages", "interests", "causes", "activity", "analytics"].includes(line.toLowerCase())) break;
        sectionLines.push(line);
      }
      return sectionLines.join("\n");
    }
  }
  return "";
}

export function AuditReport({ audit, profileData, keywords }: AuditReportProps) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle>SEO Score</CardTitle>
            <div className={`text-4xl font-bold tabular-nums ${getOverallColor(audit.overallScore)}`}>
              {audit.overallScore}
              <span className="text-lg text-muted-foreground">/100</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{audit.summary}</p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {audit.sections.map((section) => (
          <SectionCard
            key={section.section}
            section={section}
            originalContent={getSectionContent(section.section, profileData)}
            keywords={keywords}
            profileData={profileData}
          />
        ))}
      </div>
    </div>
  );
}
