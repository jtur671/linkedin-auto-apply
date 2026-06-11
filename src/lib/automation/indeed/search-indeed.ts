import { Page } from "playwright";
import { buildIndeedSearchUrl } from "./indeed-filter-builder";
import { AutomationLogger } from "@/lib/logging/logger";
import type { SearchParams } from "@/lib/filter-builder";

function randomDelay(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export interface IndeedJobCard {
  indeedJobId: string;
  title: string;
  company: string;
  location: string;
  salary: string | null;
  url: string;
}

export async function searchIndeed(
  page: Page,
  params: SearchParams,
  existingIds: Set<string>,
  logger: AutomationLogger,
): Promise<IndeedJobCard[]> {
  const allJobs: IndeedJobCard[] = [];
  const maxPages = 5;

  logger.log({
    action: "indeed_search_start",
    details: { query: params.keywords, location: params.location },
  });

  for (let currentPage = 0; currentPage < maxPages; currentPage++) {
    const url = buildIndeedSearchUrl(params, currentPage);
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(randomDelay(3000, 5000));

    // Wait for job cards
    let found = false;
    for (const sel of [
      "div.job_seen_beacon",
      "td.resultContent",
      'div[data-jk]',
      ".jobsearch-ResultsList",
    ]) {
      try {
        await page.waitForSelector(sel, { timeout: 8000 });
        found = true;
        break;
      } catch {
        continue;
      }
    }

    if (!found) {
      logger.log({
        action: "indeed_search_debug",
        details: {
          query: params.keywords,
          page: currentPage,
          message: "No job cards found",
        },
      });
      break;
    }

    // Extract job cards
    const cards = await page.$$("div.job_seen_beacon, div[data-jk]");
    if (cards.length === 0) break;

    for (const card of cards) {
      try {
        // Job ID from data-jk attribute
        let jobId =
          (await card.getAttribute("data-jk")) ?? "";
        if (!jobId) {
          const link = await card.$("a[data-jk]");
          if (link) jobId = (await link.getAttribute("data-jk")) ?? "";
        }
        if (!jobId) continue;
        if (existingIds.has(jobId)) continue;

        // Title
        let title = "";
        const titleEl =
          (await card.$("h2.jobTitle a")) ??
          (await card.$("a[data-jk] span[title]")) ??
          (await card.$("h2.jobTitle span"));
        if (titleEl) {
          title =
            (await titleEl.getAttribute("title")) ??
            ((await titleEl.textContent()) ?? "").trim();
        }

        // Company
        let company = "";
        const companyEl =
          (await card.$('span[data-testid="company-name"]')) ??
          (await card.$(".companyName")) ??
          (await card.$(".company_location .companyName"));
        if (companyEl) {
          company = ((await companyEl.textContent()) ?? "").trim();
        }

        // Location
        let location = "";
        const locEl =
          (await card.$('div[data-testid="text-location"]')) ??
          (await card.$(".companyLocation"));
        if (locEl) {
          location = ((await locEl.textContent()) ?? "").trim();
        }

        // Salary (optional)
        let salary: string | null = null;
        const salaryEl =
          (await card.$('div[data-testid="attribute_snippet_testid"]')) ??
          (await card.$(".salary-snippet-container")) ??
          (await card.$(".metadata .attribute_snippet"));
        if (salaryEl) {
          const text = ((await salaryEl.textContent()) ?? "").trim();
          if (text.includes("$") || text.toLowerCase().includes("year") || text.toLowerCase().includes("hour")) {
            salary = text;
          }
        }

        if (!title || !jobId) continue;

        const jobUrl = `https://www.indeed.com/viewjob?jk=${jobId}`;

        allJobs.push({
          indeedJobId: jobId,
          title,
          company: company || "Unknown",
          location: location || "Unknown",
          salary,
          url: jobUrl,
        });
      } catch {
        // Skip unparseable cards
      }
    }

    // Check for next page
    const nextBtn = await page.$('a[data-testid="pagination-page-next"]');
    if (!nextBtn) break;

    await nextBtn.click();
    await page.waitForTimeout(randomDelay(8000, 15000));
  }

  logger.log({
    action: "indeed_search_results",
    details: {
      query: params.keywords,
      totalFound: allJobs.length,
    },
  });

  return allJobs;
}
