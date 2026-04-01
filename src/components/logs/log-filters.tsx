"use client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

const ACTION_OPTIONS = [
  { value: "all", label: "All actions" },
  { value: "apply_success", label: "Apply Success" },
  { value: "apply_skip", label: "Apply Skip" },
  { value: "apply_error", label: "Apply Error" },
  { value: "login_success", label: "Login Success" },
  { value: "login_fail", label: "Login Fail" },
  { value: "search_start", label: "Search Start" },
  { value: "search_results", label: "Search Results" },
  { value: "captcha_detected", label: "Captcha Detected" },
  { value: "automation_start", label: "Automation Start" },
  { value: "automation_stop", label: "Automation Stop" },
];

export function LogFilters({ action, onActionChange, onExport }: { action: string; onActionChange: (v: string) => void; onExport: () => void }) {
  return (
    <div className="flex items-center gap-4">
      <Select value={action} onValueChange={onActionChange}>
        <SelectTrigger className="w-[200px]"><SelectValue placeholder="All actions" /></SelectTrigger>
        <SelectContent>
          {ACTION_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
        </SelectContent>
      </Select>
      <Button variant="outline" size="sm" onClick={onExport}>
        <Download className="h-4 w-4 mr-2" />Export for AI
      </Button>
    </div>
  );
}
