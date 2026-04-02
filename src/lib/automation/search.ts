import { Page } from "playwright";
import { buildSearchUrl, SearchParams } from "@/lib/filter-builder";
import { parseJobData, ParsedJob } from "@/lib/data-parser";
import { AutomationLogger } from "@/lib/logging/logger";
import { captureScreenshot } from "./screenshot";

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
    await page.waitForTimeout(randomDelay(3000, 5000));

    // Wait for job cards to appear — use the data-job-id attribute which is stable
    let found = false;
    try {
      await page.waitForSelector("div[data-job-id]", { timeout: 10000 });
      found = true;
    } catch {
      // Fallback: try other container selectors
      for (const sel of [".jobs-search-results-list", ".scaffold-layout__list-container", ".job-card-container"]) {
        try {
          await page.waitForSelector(sel, { timeout: 3000 });
          found = true;
          break;
        } catch { continue; }
      }
    }

    if (!found) {
      const ss = await captureScreenshot(page, `search-debug-${params.keywords}-page${currentPage}`).catch(() => "");
      logger.log({
        action: "search_debug",
        details: { query: params.keywords, page: currentPage, url: page.url(), screenshot: ss, message: "No job cards found on page" },
      });
      break;
    }

    // Find all job cards using data-job-id attribute
    const jobCards = await page.$$("div[data-job-id]");

    if (jobCards.length === 0) {
      const ss = await captureScreenshot(page, `search-no-cards-${params.keywords}`).catch(() => "");
      logger.log({ action: "search_debug", details: { query: params.keywords, cardsFound: 0, screenshot: ss } });
      break;
    }

    for (const card of jobCards) {
      try {
        // Check if this is an Easy Apply job — skip external "Apply" jobs
        const cardText = ((await card.textContent()) ?? "").toLowerCase();
        if (!cardText.includes("easy apply")) continue;

        // Extract title from the link with strong text
        let title = "";
        let href = "";

        // Primary: a.job-card-container__link strong
        const titleLink = await card.$("a.job-card-container__link");
        if (titleLink) {
          href = (await titleLink.getAttribute("href")) ?? "";
          const strong = await titleLink.$("strong");
          if (strong) {
            title = ((await strong.textContent()) ?? "").trim();
          } else {
            title = ((await titleLink.textContent()) ?? "").trim();
          }
        }

        // Fallback: any link with /jobs/view/
        if (!href) {
          const anyLink = await card.$("a[href*='/jobs/view/']");
          if (anyLink) {
            href = (await anyLink.getAttribute("href")) ?? "";
            if (!title) {
              const strong = await anyLink.$("strong");
              title = strong
                ? ((await strong.textContent()) ?? "").trim()
                : ((await anyLink.textContent()) ?? "").trim();
            }
          }
        }

        // Extract company from subtitle
        let company = "";
        const subtitleEl = await card.$(".artdeco-entity-lockup__subtitle span");
        if (subtitleEl) {
          company = ((await subtitleEl.textContent()) ?? "").trim();
        }
        if (!company) {
          const subEl = await card.$(".artdeco-entity-lockup__subtitle");
          if (subEl) company = ((await subEl.textContent()) ?? "").trim();
        }
        if (!company) {
          const descEl = await card.$(".job-card-container__primary-description");
          if (descEl) company = ((await descEl.textContent()) ?? "").trim();
        }

        // Extract location from caption
        let location = "";
        const captionLi = await card.$(".artdeco-entity-lockup__caption li span");
        if (captionLi) {
          location = ((await captionLi.textContent()) ?? "").trim();
        }
        if (!location) {
          const captionEl = await card.$(".artdeco-entity-lockup__caption");
          if (captionEl) location = ((await captionEl.textContent()) ?? "").trim();
        }
        if (!location) {
          const metaEl = await card.$(".job-card-container__metadata-item");
          if (metaEl) location = ((await metaEl.textContent()) ?? "").trim();
        }

        if (!href || !title) continue;

        const fullUrl = href.startsWith("http")
          ? href.split("?")[0]
          : `https://www.linkedin.com${href.split("?")[0]}`;

        const parsed = parseJobData({
          title,
          company: company || "Unknown",
          location: location || "Unknown",
          url: fullUrl,
        });
        if (parsed) allJobs.push(parsed);
      } catch {
        // Skip unparseable cards
      }
    }

    // Pagination
    const nextSelectors = [
      'button[aria-label="View next page"]',
      'button[aria-label="Next"]',
      'li.artdeco-pagination__indicator--number:last-child button',
    ];
    let hasNext = false;
    for (const sel of nextSelectors) {
      const btn = await page.$(sel);
      if (btn) {
        const disabled = await btn.getAttribute("disabled");
        if (disabled === null) {
          await btn.click();
          hasNext = true;
          break;
        }
      }
    }
    if (!hasNext) break;

    currentPage++;
    await page.waitForTimeout(randomDelay(2000, 4000));
  }

  logger.log({ action: "search_results", details: { query: params.keywords, totalFound: allJobs.length, pagesScanned: currentPage + 1 } });
  return allJobs;
}
