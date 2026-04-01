"use client";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function JobFilters({ search, status, onSearchChange, onStatusChange }: { search: string; status: string; onSearchChange: (v: string) => void; onStatusChange: (v: string) => void }) {
  return (
    <div className="flex gap-4">
      <Input placeholder="Search jobs..." value={search} onChange={e => onSearchChange(e.target.value)} className="max-w-sm" />
      <Select value={status} onValueChange={onStatusChange}>
        <SelectTrigger className="w-[180px]"><SelectValue placeholder="All statuses" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          <SelectItem value="applied">Applied</SelectItem>
          <SelectItem value="skipped">Skipped</SelectItem>
          <SelectItem value="needs_review">Needs Review</SelectItem>
          <SelectItem value="error">Error</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
