"use client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { format } from "date-fns";

interface Job { id: number; title: string; company: string; location: string; url: string; status: string; skipReason: string | null; appliedAt: string; searchQuery: string; }

export function JobTable({ jobs }: { jobs: Job[] }) {
  if (jobs.length === 0) return <p className="text-muted-foreground text-sm py-8 text-center">No jobs found.</p>;

  const rows: React.ReactNode[] = [];
  jobs.forEach((job, index) => {
    rows.push(
      <TableRow key={job.id}>
        <TableCell className="font-medium">{job.title}</TableCell>
        <TableCell>{job.company}</TableCell>
        <TableCell>{job.location}</TableCell>
        <TableCell><StatusBadge status={job.status} /></TableCell>
        <TableCell className="text-muted-foreground">{format(new Date(job.appliedAt), "MMM d, yyyy")}</TableCell>
        <TableCell className="text-muted-foreground text-xs">{job.searchQuery}</TableCell>
        <TableCell><a href={job.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline text-sm">View</a></TableCell>
      </TableRow>
    );

  });

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Title</TableHead>
          <TableHead>Company</TableHead>
          <TableHead>Location</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Query</TableHead>
          <TableHead></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>{rows}</TableBody>
    </Table>
  );
}
