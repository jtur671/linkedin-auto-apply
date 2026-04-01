import { Browser } from "playwright";
import { login } from "./login";
import { searchJobs } from "./search";
import { applyToJob, saveJobResult } from "./apply";
import { getState, updateState } from "./state";
import { AutomationLogger } from "@/lib/logging/logger";
import { loadProcessedJobIds, isJobProcessed } from "@/lib/dedup";
import { prisma } from "@/lib/db";
import { SearchParams } from "@/lib/filter-builder";
import { ProfileAnswerRecord } from "@/lib/field-matcher";

let activeBrowser: Browser | null = null;

function randomDelay(min: number, max: number): number { return Math.floor(Math.random() * (max - min + 1)) + min; }

export async function startAutomation(): Promise<void> {
  const logger = new AutomationLogger();
  logger.log({ action: "automation_start" });
  updateState({ status: "running", startedAt: new Date().toISOString() });
  try {
    const loginResult = await login(logger);
    activeBrowser = loginResult.browser;
    if (!loginResult.success) {
      updateState({ status: "error", currentJob: "Login failed" });
      logger.log({ action: "automation_stop", reason: "login_failed" });
      await loginResult.browser.close(); return;
    }
    const page = loginResult.page;
    const configs = await prisma.searchConfig.findMany({ where: { isActive: true } });
    if (configs.length === 0) {
      updateState({ status: "error", currentJob: "No active search configs" });
      logger.log({ action: "automation_stop", reason: "no_configs" });
      await loginResult.browser.close(); return;
    }
    const answers: ProfileAnswerRecord[] = (await prisma.profileAnswer.findMany()).map(a => ({ fieldLabel: a.fieldLabel, fieldType: a.fieldType, answer: a.answer }));
    const processedIds = await loadProcessedJobIds();
    let totalApplied = 0; const maxPerSession = 50;

    for (const config of configs) {
      if (getState().status === "stopping") break;
      const params: SearchParams = { keywords: config.keywords, location: config.location || undefined, remotePreference: config.remotePreference as SearchParams["remotePreference"], experienceLevel: config.experienceLevel as SearchParams["experienceLevel"], datePosted: config.datePosted as SearchParams["datePosted"] };
      updateState({ currentJob: `Searching for "${config.keywords}"...` });
      const jobs = await searchJobs(page, params, logger);
      for (const job of jobs) {
        if (getState().status === "stopping") break;
        if (totalApplied >= maxPerSession) break;
        if (isJobProcessed(job.linkedinJobId, processedIds)) continue;
        const result = await applyToJob(page, job, answers, logger);
        await saveJobResult(job, result, config.keywords);
        processedIds.add(job.linkedinJobId);
        if (result.status === "applied") { totalApplied++; updateState({ appliedThisRun: getState().appliedThisRun + 1 }); }
        else if (result.status === "skipped" || result.status === "needs_review") { updateState({ skippedThisRun: getState().skippedThisRun + 1 }); }
        else { updateState({ errorsThisRun: getState().errorsThisRun + 1 }); }
        await page.waitForTimeout(randomDelay(3000, 8000));
      }
      if (totalApplied >= maxPerSession) break;
    }
    logger.log({ action: "automation_stop", details: { applied: getState().appliedThisRun, skipped: getState().skippedThisRun, errors: getState().errorsThisRun } });
    await loginResult.browser.close(); activeBrowser = null;
    updateState({ status: "idle", currentJob: null });
  } catch (err) {
    logger.log({ action: "automation_stop", reason: String(err) });
    updateState({ status: "error", currentJob: `Error: ${String(err)}` });
    if (activeBrowser) { await activeBrowser.close().catch(() => {}); activeBrowser = null; }
  }
}

export async function stopAutomation(): Promise<void> {
  updateState({ status: "stopping" });
  if (activeBrowser) {
    setTimeout(async () => { if (activeBrowser) { await activeBrowser.close().catch(() => {}); activeBrowser = null; updateState({ status: "idle", currentJob: null }); } }, 10000);
  }
}
