import { Badge } from "@/components/ui/badge";

const statusColors: Record<string, string> = {
  applied: "bg-green-500/20 text-green-400 border-green-500/30",
  skipped: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  needs_review: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  error: "bg-red-500/20 text-red-400 border-red-500/30",
};

export function StatusBadge({ status }: { status: string }) {
  return <Badge variant="outline" className={statusColors[status] ?? ""}>{status.replace("_", " ")}</Badge>;
}
