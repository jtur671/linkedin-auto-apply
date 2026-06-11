"use client";
import { Badge } from "@/components/ui/badge";
import { Check, X } from "lucide-react";

interface Requirement {
  id: number;
  category: string;
  requirement: string;
  isRequired: boolean;
  matched: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
  technical_skill: "Technical Skills",
  soft_skill: "Soft Skills",
  education: "Education",
  experience: "Experience",
  certification: "Certifications",
  other: "Other",
};

const CATEGORY_ORDER = [
  "technical_skill",
  "experience",
  "education",
  "certification",
  "soft_skill",
  "other",
];

export function RequirementsList({
  requirements,
}: {
  requirements: Requirement[];
}) {
  // Group by category
  const grouped = new Map<string, Requirement[]>();
  for (const req of requirements) {
    const list = grouped.get(req.category) ?? [];
    list.push(req);
    grouped.set(req.category, list);
  }

  // Sort categories
  const sortedCategories = CATEGORY_ORDER.filter((c) => grouped.has(c));

  if (requirements.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        No requirements extracted for this job.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {sortedCategories.map((category) => {
        const reqs = grouped.get(category)!;
        return (
          <div key={category} className="space-y-2">
            <h4 className="text-sm font-semibold">
              {CATEGORY_LABELS[category] ?? category}
            </h4>
            <div className="space-y-1.5">
              {reqs.map((req) => (
                <div
                  key={req.id}
                  className="flex items-start gap-2 rounded-md border px-3 py-2"
                >
                  <div className="mt-0.5 shrink-0">
                    {req.matched ? (
                      <Check className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <X className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                  <span className="text-sm flex-1">{req.requirement}</span>
                  <Badge
                    variant={req.isRequired ? "default" : "secondary"}
                    className={
                      req.isRequired
                        ? "bg-primary/10 text-primary border-primary/20"
                        : "bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-400"
                    }
                  >
                    {req.isRequired ? "Required" : "Preferred"}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
