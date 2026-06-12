"use client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { buttonVariants } from "@/components/ui/button";
import { MatchBadge } from "./match-badge";
import { ExternalLink } from "lucide-react";
import Link from "next/link";

interface DiscoveredJob {
  id: number;
  title: string;
  company: string;
  location: string;
  salary: string | null;
  matchScore: number | null;
  applyUrl: string | null;
  url: string;
  requirementsCount: number;
  scrapedAt: string;
}

export function IndeedJobTable({ jobs }: { jobs: DiscoveredJob[] }) {
  if (jobs.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        No jobs scraped yet. Click &quot;Start Scraping Indeed&quot; to begin.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[70px]">Match</TableHead>
          <TableHead>Title</TableHead>
          <TableHead>Company</TableHead>
          <TableHead>Location</TableHead>
          <TableHead>Salary</TableHead>
          <TableHead className="w-[60px]">Reqs</TableHead>
          <TableHead className="w-[100px]">Apply</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {jobs.map((job) => (
          <TableRow key={job.id}>
            <TableCell>
              <MatchBadge score={job.matchScore} />
            </TableCell>
            <TableCell>
              <Link
                href={`/indeed/${job.id}`}
                className="font-medium hover:underline"
              >
                {job.title}
              </Link>
            </TableCell>
            <TableCell className="text-muted-foreground">
              {job.company}
            </TableCell>
            <TableCell className="text-muted-foreground">
              {job.location}
            </TableCell>
            <TableCell className="text-muted-foreground">
              {job.salary ?? "--"}
            </TableCell>
            <TableCell className="text-muted-foreground">
              {job.requirementsCount}
            </TableCell>
            <TableCell>
              <a
                href={job.applyUrl ?? job.url}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                {job.applyUrl ? "Apply" : "View"}
                <ExternalLink className="ml-1 h-3 w-3" />
              </a>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
