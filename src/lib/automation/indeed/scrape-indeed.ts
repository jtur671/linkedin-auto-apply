import { Page } from "playwright";
import { AutomationLogger } from "@/lib/logging/logger";

function randomDelay(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export interface IndeedJobDetail {
  descriptionHtml: string;
  descriptionText: string;
  applyUrl: string | null;
  salary: string | null;
  jobType: string | null;
}

export async function scrapeIndeedJob(
  page: Page,
  jobUrl: string,
  logger: AutomationLogger,
): Promise<IndeedJobDetail | null> {
  try {
    await page.goto(jobUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(randomDelay(2000, 4000));

    // Wait for job description
    let descriptionEl = null;
    for (const sel of [
      "#jobDescriptionText",
      ".jobsearch-JobComponent-description",
      'div[id="jobDescriptionText"]',
    ]) {
      try {
        await page.waitForSelector(sel, { timeout: 8000 });
        descriptionEl = await page.$(sel);
        if (descriptionEl) break;
      } catch {
        continue;
      }
    }

    if (!descriptionEl) {
      logger.log({
        action: "indeed_scrape_debug",
        details: { url: jobUrl, message: "No description found" },
      });
      return null;
    }

    const descriptionHtml = (await descriptionEl.innerHTML()) ?? "";
    const descriptionText = (await descriptionEl.textContent()) ?? "";

    // Extract the apply URL
    let applyUrl: string | null = null;

    // Method 1: Check for external apply button with direct href
    const applyBtn = await page.$(
      'a[data-indeed-apply-joburl], a#indeedApplyButton, button[id="indeedApplyButton"]',
    );
    if (applyBtn) {
      const tagName = await applyBtn.evaluate((el) => el.tagName.toLowerCase());
      if (tagName === "a") {
        applyUrl = (await applyBtn.getAttribute("href")) ?? null;
        // Also check data attribute
        if (!applyUrl) {
          applyUrl =
            (await applyBtn.getAttribute("data-indeed-apply-joburl")) ?? null;
        }
      }
    }

    // Method 2: Check for "Apply now" link that goes external
    if (!applyUrl) {
      const applyLinks = await page.$$(
        'a[href*="rc/clk"], a.jcs-JobTitle, a[data-jk]',
      );
      for (const link of applyLinks) {
        const href = (await link.getAttribute("href")) ?? "";
        if (href.includes("rc/clk") || href.includes("apply")) {
          applyUrl = href.startsWith("http")
            ? href
            : `https://www.indeed.com${href}`;
          break;
        }
      }
    }

    // Method 3: Look for the apply button container
    if (!applyUrl) {
      const applyContainer = await page.$(
        '#applyButtonLinkContainer a, .jobsearch-IndeedApplyButton-newDesign a',
      );
      if (applyContainer) {
        applyUrl = (await applyContainer.getAttribute("href")) ?? null;
      }
    }

    // If we got a redirect URL, try to resolve it
    if (applyUrl && applyUrl.includes("indeed.com/rc/clk")) {
      try {
        const resolved = await page.evaluate(async (url: string) => {
          const resp = await fetch(url, {
            method: "HEAD",
            redirect: "follow",
          });
          return resp.url;
        }, applyUrl);
        if (resolved && !resolved.includes("indeed.com")) {
          applyUrl = resolved;
        }
      } catch {
        // Keep the Indeed redirect URL as fallback
      }
    }

    // Salary
    let salary: string | null = null;
    const salaryEl = await page.$(
      '#salaryInfoAndJobType span.css-19j1a75, [data-testid="attribute_snippet_testid"], .jobsearch-JobMetadataHeader-item',
    );
    if (salaryEl) {
      const text = ((await salaryEl.textContent()) ?? "").trim();
      if (text.includes("$") || text.toLowerCase().includes("year") || text.toLowerCase().includes("hour")) {
        salary = text;
      }
    }

    // Job type
    let jobType: string | null = null;
    const jobTypeEl = await page.$(
      '#salaryInfoAndJobType .css-k5flys, [data-testid="inlineHeader-linkText"]',
    );
    if (jobTypeEl) {
      const text = ((await jobTypeEl.textContent()) ?? "").trim().toLowerCase();
      if (
        text.includes("full-time") ||
        text.includes("part-time") ||
        text.includes("contract") ||
        text.includes("temporary") ||
        text.includes("internship")
      ) {
        jobType = text;
      }
    }

    return { descriptionHtml, descriptionText, applyUrl, salary, jobType };
  } catch (err) {
    logger.log({
      action: "indeed_scrape_error",
      details: { url: jobUrl, error: String(err) },
    });
    return null;
  }
}
