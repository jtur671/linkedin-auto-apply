// src/lib/automation/indeed/engine-indeed.ts
import { searchAdzuna, type NormalizedJob } from "@/lib/jobs/adzuna";
import { ingestJobs } from "@/lib/jobs/ingest";
import { scoreJobMatch } from "./match-scorer";
import {
  getIndeedState,
  updateIndeedState,
  resetIndeedState,
} from "./state-indeed";
import { AutomationLogger } from "@/lib/logging/logger";
import { prisma } from "@/lib/db";

export async function startIndeedScrape(): Promise<void> {
  const logger = new AutomationLogger();
  logger.log({ action: "indeed_start" });
  resetIndeedState();
  updateIndeedState({
    status: "running",
    phase: "searching",
    startedAt: new Date().toISOString(),
  });

  try {
    const configs = await prisma.searchConfig.findMany({ where: { isActive: true } });
    if (configs.length === 0) {
      updateIndeedState({ status: "error", phase: "No active search configs" });
      logger.log({ action: "indeed_stop", reason: "no_configs" });
      return;
    }

    const existing = await prisma.indeedJob.findMany({ select: { indeedJobId: true } });
    const seenIds = new Set(existing.map((j) => j.indeedJobId));

    const savedJobIds: number[] = [];
    for (const config of configs) {
      if (getIndeedState().status === "stopping") break;

      let jobs: NormalizedJob[];
      try {
        jobs = await searchAdzuna({
          what: config.keywords,
          where: config.location || undefined,
          resultsPerPage: 50,
        });
      } catch (err) {
        updateIndeedState({ errors: getIndeedState().errors + 1 });
        logger.log({ action: "indeed_error", reason: String(err) });
        continue;
      }
      updateIndeedState({ searched: getIndeedState().searched + jobs.length });

      const ids = await ingestJobs(jobs, config.keywords, seenIds);
      savedJobIds.push(...ids);
      updateIndeedState({
        scraped: getIndeedState().scraped + ids.length,
        total: getIndeedState().total + jobs.length,
      });
    }

    // Phase: AI match scoring (unchanged behavior)
    const hasResume = await prisma.resume.findFirst({ where: { isActive: true } });
    if (hasResume && savedJobIds.length > 0) {
      updateIndeedState({ phase: "scoring" });
      for (const id of savedJobIds) {
        if (getIndeedState().status === "stopping") break;
        try {
          await scoreJobMatch(id);
          updateIndeedState({ scored: getIndeedState().scored + 1 });
        } catch {
          updateIndeedState({ errors: getIndeedState().errors + 1 });
        }
        await new Promise((r) => setTimeout(r, 1500));
      }
    }

    logger.log({
      action: "indeed_stop",
      details: {
        searched: getIndeedState().searched,
        scraped: getIndeedState().scraped,
        scored: getIndeedState().scored,
        errors: getIndeedState().errors,
      },
    });
    updateIndeedState({ status: "idle", phase: null });
  } catch (err) {
    logger.log({ action: "indeed_stop", reason: String(err) });
    updateIndeedState({ status: "error", phase: `Error: ${String(err)}` });
  }
}

export async function stopIndeedScrape(): Promise<void> {
  updateIndeedState({ status: "stopping" });
  // No browser to tear down; settle back to idle promptly.
  setTimeout(() => {
    if (getIndeedState().status === "stopping") {
      updateIndeedState({ status: "idle", phase: null });
    }
  }, 500);
}
