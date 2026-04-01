import { Page } from "playwright";
import { buildSearchUrl, SearchParams } from "@/lib/filter-builder";
import { parseJobData, ParsedJob } from "@/lib/data-parser";
import { AutomationLogger } from "@/lib/logging/logger";

function randomDelay(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export async function searchJobs(page: Page, params: SearchParams, logger: AutomationLogger): Promise<ParsedJob[]> {
  const allJobs: ParsedJob[] = [];
  let currentPage = 0;
  const maxPages = 10;

  logger.log({ action: "search_start", details: { query: params.keywords, location: params.location } });

  while (currentPage < maxPages) {
    const url = buildSearchUrl(params, currentPage);
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
    await page.waitForTimeout(randomDelay(2000, 4000));

    try { await page.waitForSelector(".jobs-search-results-list", { timeout: 10000 }); } catch { break; }

    const jobCards = await page.$$(".jobs-search-results__list-item, .job-card-container");
    if (jobCards.length === 0) break;

    for (const card of jobCards) {
      try {
        const title = await card.$eval(".job-card-list__title, .artdeco-entity-lockup__title", (el) => el.textContent ?? "").catch(() => "");
        const company = await card.$eval(".job-card-container__primary-description, .artdeco-entity-lockup__subtitle", (el) => el.textContent ?? "").catch(() => "");
        const location = await card.$eval(".job-card-container__metadata-item, .artdeco-entity-lockup__caption", (el) => el.textContent ?? "").catch(() => "");
        const linkEl = await card.$("a.job-card-list__title, a.job-card-container__link");
        const href = linkEl ? await linkEl.getAttribute("href") : null;
        const jobUrl = href ? `https://www.linkedin.com${href.split("?")[0]}` : "";
        const parsed = parseJobData({ title, company, location, url: jobUrl });
        if (parsed) allJobs.push(parsed);
      } catch { /* skip */ }
    }

    const nextButton = await page.$('button[aria-label="Next"]');
    const isDisabled = nextButton ? await nextButton.getAttribute("disabled") : "true";
    if (!nextButton || isDisabled !== null) break;

    currentPage++;
    await page.waitForTimeout(randomDelay(1000, 3000));
  }

  logger.log({ action: "search_results", details: { query: params.keywords, totalFound: allJobs.length, pagesScanned: currentPage + 1 } });
  return allJobs;
}
