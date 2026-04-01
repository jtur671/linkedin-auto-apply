import { Page } from "playwright";
import { ParsedJob } from "@/lib/data-parser";
import { ProfileAnswerRecord } from "@/lib/field-matcher";
import { fillFormStep } from "./form-filler";
import { captureScreenshot } from "./screenshot";
import { AutomationLogger } from "@/lib/logging/logger";
import { prisma } from "@/lib/db";
import { updateState } from "./state";

function randomDelay(min: number, max: number): number { return Math.floor(Math.random() * (max - min + 1)) + min; }

export interface ApplyResult { status: "applied" | "skipped" | "needs_review" | "error"; reason?: string; screenshot?: string; }

export async function applyToJob(page: Page, job: ParsedJob, answers: ProfileAnswerRecord[], logger: AutomationLogger): Promise<ApplyResult> {
  const startTime = Date.now();
  updateState({ currentJob: `Applying to ${job.title} at ${job.company}` });
  try {
    await page.goto(job.url, { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForTimeout(randomDelay(1000, 2000));
    const easyApplyBtn = await page.$('button.jobs-apply-button, button[aria-label*="Easy Apply"]');
    if (!easyApplyBtn) return { status: "skipped", reason: "No Easy Apply button found" };
    await easyApplyBtn.click();
    await page.waitForTimeout(randomDelay(1000, 2000));

    for (let step = 0; step < 10; step++) {
      await page.waitForTimeout(randomDelay(500, 1000));
      const submitBtn = await page.$('button[aria-label="Submit application"]');
      if (submitBtn) {
        const fill = await fillFormStep(page, answers);
        if (!fill.success) {
          const ss = await captureScreenshot(page, `${job.company}-${job.title}-unfilled`);
          logger.log({ action: "apply_skip", job: { linkedinJobId: job.linkedinJobId, title: job.title, company: job.company, url: job.url }, reason: "unknown_required_field", details: { unfilledFields: fill.unfilledFields, formStep: step + 1 }, screenshot: ss, durationMs: Date.now() - startTime });
          const close = await page.$('button[aria-label="Dismiss"]'); if (close) await close.click();
          const discard = await page.$('button[data-test-dialog-primary-btn]'); if (discard) await discard.click();
          return { status: "needs_review", reason: `Unknown fields: ${fill.unfilledFields.map(f => f.label).join(", ")}`, screenshot: ss };
        }
        await submitBtn.click();
        await page.waitForTimeout(randomDelay(1000, 2000));
        logger.log({ action: "apply_success", job: { linkedinJobId: job.linkedinJobId, title: job.title, company: job.company, url: job.url }, details: { formSteps: step + 1 }, durationMs: Date.now() - startTime });
        const done = await page.$('button[aria-label="Done"], button[aria-label="Dismiss"]'); if (done) await done.click();
        return { status: "applied" };
      }
      const fill = await fillFormStep(page, answers);
      if (!fill.success) {
        const ss = await captureScreenshot(page, `${job.company}-${job.title}-unfilled`);
        logger.log({ action: "apply_skip", job: { linkedinJobId: job.linkedinJobId, title: job.title, company: job.company, url: job.url }, reason: "unknown_required_field", details: { unfilledFields: fill.unfilledFields, formStep: step + 1 }, screenshot: ss, durationMs: Date.now() - startTime });
        const close = await page.$('button[aria-label="Dismiss"]'); if (close) await close.click();
        const discard = await page.$('button[data-test-dialog-primary-btn]'); if (discard) await discard.click();
        return { status: "needs_review", reason: `Unknown fields: ${fill.unfilledFields.map(f => f.label).join(", ")}`, screenshot: ss };
      }
      const next = await page.$('button[aria-label="Continue to next step"], button[aria-label="Review your application"]');
      if (next) { await next.click(); await page.waitForTimeout(randomDelay(500, 1500)); } else break;
    }
    const ss = await captureScreenshot(page, `${job.company}-${job.title}-stuck`);
    logger.log({ action: "apply_error", job: { linkedinJobId: job.linkedinJobId, title: job.title, company: job.company, url: job.url }, reason: "max_steps_exceeded", screenshot: ss, durationMs: Date.now() - startTime });
    return { status: "error", reason: "Max form steps exceeded", screenshot: ss };
  } catch (err) {
    const ss = await captureScreenshot(page, `${job.company}-${job.title}-error`).catch(() => undefined);
    logger.log({ action: "apply_error", job: { linkedinJobId: job.linkedinJobId, title: job.title, company: job.company, url: job.url }, reason: String(err), screenshot: ss, durationMs: Date.now() - startTime });
    return { status: "error", reason: String(err), screenshot: ss };
  }
}

export async function saveJobResult(job: ParsedJob, result: ApplyResult, searchQuery: string): Promise<void> {
  await prisma.job.upsert({
    where: { linkedinJobId: job.linkedinJobId },
    create: { linkedinJobId: job.linkedinJobId, title: job.title, company: job.company, location: job.location, url: job.url, status: result.status, skipReason: result.reason, searchQuery },
    update: { status: result.status, skipReason: result.reason },
  });
}
