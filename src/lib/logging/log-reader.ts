import fs from "fs";
import path from "path";
import { LogEntry } from "./logger";

export interface LogFilter { action?: string; date?: string; }

export function readLogs(logDir?: string, filter?: LogFilter): LogEntry[] {
  const dir = logDir ?? path.join(process.cwd(), "logs");
  if (!fs.existsSync(dir)) return [];
  let files = fs.readdirSync(dir).filter((f) => f.startsWith("automation-") && f.endsWith(".jsonl")).sort();
  if (filter?.date) files = files.filter((f) => f === `automation-${filter.date}.jsonl`);
  const entries: LogEntry[] = [];
  for (const file of files) {
    const lines = fs.readFileSync(path.join(dir, file), "utf8").trim().split("\n").filter(Boolean);
    for (const line of lines) {
      const entry: LogEntry = JSON.parse(line);
      if (filter?.action && entry.action !== filter.action) continue;
      entries.push(entry);
    }
  }
  return entries;
}
