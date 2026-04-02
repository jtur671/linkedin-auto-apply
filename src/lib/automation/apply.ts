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
    await page.waitForTimeout(randomDelay(2000, 3000));

    // Check for rate limit message before trying to apply
    const pageText = ((await page.textContent("body")) ?? "").toLowerCase();
    if (pageText.includes("limit daily submissions") || pageText.includes("apply tomorrow") || pageText.includes("save this job and apply")) {
      return { status: "error", reason: "LinkedIn rate limit — daily submission cap reached" };
    }

    // Primary: the stable button ID that LinkedIn uses
    let easyApplyBtn = await page.$("#jobs-apply-button-id");
    // Fallbacks
    if (!easyApplyBtn) {
      const fallbacks = [
        'button.jobs-apply-button',
        'button[aria-label*="Easy Apply"]',
        '.jobs-apply-button--top-card button',
        '.jobs-s-apply button',
      ];
      for (const sel of fallbacks) {
        try {
          easyApplyBtn = await page.$(sel);
          if (easyApplyBtn) break;
        } catch { continue; }
      }
    }
    if (!easyApplyBtn) {
      const ss = await captureScreenshot(page, `${job.company}-no-easy-apply`).catch(() => undefined);
      return { status: "skipped", reason: "No Easy Apply button found", screenshot: ss };
    }
    // Scroll the button into view before clicking — it may be below the fold
    await easyApplyBtn.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    try {
      await easyApplyBtn.click({ timeout: 5000 });
    } catch {
      // Force click if normal click fails (element may be obscured)
      await easyApplyBtn.evaluate((el: HTMLElement) => el.click());
    }
    await page.waitForTimeout(randomDelay(1000, 2000));

    // Check for rate limit after clicking Easy Apply
    const modalText = ((await page.textContent("body")) ?? "").toLowerCase();
    if (modalText.includes("limit daily submissions") || modalText.includes("apply tomorrow") || modalText.includes("save this job and apply")) {
      const close = await page.$('button[aria-label="Dismiss"]'); if (close) await close.click();
      return { status: "error", reason: "LinkedIn rate limit — daily submission cap reached" };
    }

    for (let step = 0; step < 10; step++) {
      await page.waitForTimeout(randomDelay(500, 1000));
      // Check for submit button — try multiple selectors
      let submitBtn = await page.$('button[aria-label="Submit application"]')
        ?? await page.$('button[aria-label*="Submit application"]');
      // Fallback: find any button whose text content is "Submit application"
      if (!submitBtn) {
        const allButtons = await page.$$('button.artdeco-button--primary');
        for (const btn of allButtons) {
          const text = ((await btn.textContent()) ?? "").trim();
          if (text.toLowerCase().includes("submit application")) {
            submitBtn = btn;
            break;
          }
        }
      }
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
        // Close the "Application sent" confirmation modal
        await page.waitForTimeout(1000);
        const doneBtn = await page.$('[data-test-modal] button.artdeco-button--primary')
          ?? await page.$('button[aria-label="Done"]')
          ?? await page.$('[data-test-modal-close-btn]')
          ?? await page.$('button[aria-label="Dismiss"]');
        if (doneBtn) await doneBtn.click();
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
      // Use LinkedIn's stable data attribute for next button, with aria-label fallbacks
      const next = await page.$('[data-easy-apply-next-button]')
        ?? await page.$('button[aria-label="Continue to next step"]')
        ?? await page.$('button[aria-label="Review your application"]');
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
