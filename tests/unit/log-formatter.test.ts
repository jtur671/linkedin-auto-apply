import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import { AutomationLogger } from "@/lib/logging/logger";
import { readLogs } from "@/lib/logging/log-reader";

const TEST_LOG_DIR = path.join(process.cwd(), "tests", "tmp-logs");

describe("AutomationLogger", () => {
  let logger: AutomationLogger;

  beforeEach(() => {
    fs.mkdirSync(TEST_LOG_DIR, { recursive: true });
    logger = new AutomationLogger(TEST_LOG_DIR);
  });

  afterEach(() => {
    fs.rmSync(TEST_LOG_DIR, { recursive: true, force: true });
  });

  it("writes a valid JSONL entry", () => {
    logger.log({
      action: "apply_success",
      job: { linkedinJobId: "123", title: "QA Engineer", company: "Acme", url: "https://linkedin.com/jobs/view/123" },
    });
    const files = fs.readdirSync(TEST_LOG_DIR);
    expect(files).toHaveLength(1);
    expect(files[0]).toMatch(/^automation-\d{4}-\d{2}-\d{2}\.jsonl$/);
    const content = fs.readFileSync(path.join(TEST_LOG_DIR, files[0]), "utf8");
    const entry = JSON.parse(content.trim());
    expect(entry.action).toBe("apply_success");
    expect(entry.job.company).toBe("Acme");
    expect(entry.timestamp).toBeDefined();
  });

  it("appends multiple entries", () => {
    logger.log({ action: "automation_start" });
    logger.log({ action: "search_start", details: { query: "SDET" } });
    logger.log({ action: "automation_stop" });
    const files = fs.readdirSync(TEST_LOG_DIR);
    const lines = fs.readFileSync(path.join(TEST_LOG_DIR, files[0]), "utf8").trim().split("\n");
    expect(lines).toHaveLength(3);
  });

  it("includes optional fields", () => {
    logger.log({
      action: "apply_skip",
      job: { linkedinJobId: "456", title: "SDET", company: "TechCo", url: "https://linkedin.com/jobs/view/456" },
      reason: "unknown_required_field",
      details: { fieldLabel: "Cover letter", fieldType: "textarea" },
      screenshot: "screenshots/test.png",
      durationMs: 5000,
    });
    const files = fs.readdirSync(TEST_LOG_DIR);
    const entry = JSON.parse(fs.readFileSync(path.join(TEST_LOG_DIR, files[0]), "utf8").trim());
    expect(entry.reason).toBe("unknown_required_field");
    expect(entry.screenshot).toBe("screenshots/test.png");
    expect(entry.durationMs).toBe(5000);
  });
});

describe("readLogs", () => {
  beforeEach(() => { fs.mkdirSync(TEST_LOG_DIR, { recursive: true }); });
  afterEach(() => { fs.rmSync(TEST_LOG_DIR, { recursive: true, force: true }); });

  it("reads and parses JSONL", () => {
    const e1 = JSON.stringify({ timestamp: "2026-04-01T10:00:00Z", action: "apply_success" });
    const e2 = JSON.stringify({ timestamp: "2026-04-01T10:01:00Z", action: "apply_skip" });
    fs.writeFileSync(path.join(TEST_LOG_DIR, "automation-2026-04-01.jsonl"), `${e1}\n${e2}\n`);
    const logs = readLogs(TEST_LOG_DIR);
    expect(logs).toHaveLength(2);
  });

  it("filters by action", () => {
    const e1 = JSON.stringify({ timestamp: "2026-04-01T10:00:00Z", action: "apply_success" });
    const e2 = JSON.stringify({ timestamp: "2026-04-01T10:01:00Z", action: "apply_skip" });
    fs.writeFileSync(path.join(TEST_LOG_DIR, "automation-2026-04-01.jsonl"), `${e1}\n${e2}\n`);
    const logs = readLogs(TEST_LOG_DIR, { action: "apply_skip" });
    expect(logs).toHaveLength(1);
  });

  it("returns empty for no files", () => {
    expect(readLogs(TEST_LOG_DIR)).toEqual([]);
  });
});
