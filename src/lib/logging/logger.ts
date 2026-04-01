import fs from "fs";
import path from "path";

export interface LogJob { linkedinJobId: string; title: string; company: string; url: string; }
export interface LogEntry { timestamp: string; action: string; job?: LogJob; reason?: string; details?: Record<string, unknown>; screenshot?: string; durationMs?: number; }
export type LogInput = Omit<LogEntry, "timestamp">;

export class AutomationLogger {
  private logDir: string;
  constructor(logDir?: string) {
    this.logDir = logDir ?? path.join(process.cwd(), "logs");
    fs.mkdirSync(this.logDir, { recursive: true });
  }
  log(input: LogInput): LogEntry {
    const entry: LogEntry = { timestamp: new Date().toISOString(), ...input };
    const date = new Date().toISOString().split("T")[0];
    fs.appendFileSync(path.join(this.logDir, `automation-${date}.jsonl`), JSON.stringify(entry) + "\n");
    return entry;
  }
}
