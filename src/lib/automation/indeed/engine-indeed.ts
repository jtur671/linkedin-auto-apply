import { chromium, Browser } from "playwright";
import { searchIndeed, IndeedJobCard } from "./search-indeed";
import { scrapeIndeedJob } from "./scrape-indeed";
import { parseRequirements } from "./parse-requirements";
import { scoreJobMatch } from "./match-scorer";
import {
  getIndeedState,
  updateIndeedState,
  resetIndeedState,
} from "./state-indeed";
import { AutomationLogger } from "@/lib/logging/logger";
import { prisma } from "@/lib/db";
import type { SearchParams } from "@/lib/filter-builder";

let activeBrowser: Browser | null = null;

function randomDelay(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

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
    // Launch browser with stealth settings
    const browser = await chromium.launch({
      headless: true,
      args: [
        "--disable-blink-features=AutomationControlled",
        "--no-sandbox",
      ],
    });
    activeBrowser = browser;

    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      viewport: { width: 1920, height: 1080 },
    });

    const page = await context.newPage();

    // Load active search configs
    const configs = await prisma.searchConfig.findMany({
      where: { isActive: true },
    });

    if (configs.length === 0) {
      updateIndeedState({
        status: "error",
        phase: "No active search configs",
      });
      logger.log({ action: "indeed_stop", reason: "no_configs" });
      await browser.close();
      activeBrowser = null;
      return;
    }

    // Get already-scraped job IDs for dedup
    const existingJobs = await prisma.indeedJob.findMany({
      select: { indeedJobId: true },
    });
    const existingIds = new Set(existingJobs.map((j) => j.indeedJobId));

    // Phase 1: Search all configs and collect job cards
    const allCards: IndeedJobCard[] = [];

    for (const config of configs) {
      if (getIndeedState().status === "stopping") break;

      const params: SearchParams = {
        keywords: config.keywords,
        location: config.location || undefined,
        remotePreference: config.remotePreference as SearchParams["remotePreference"],
        experienceLevel: config.experienceLevel as SearchParams["experienceLevel"],
        datePosted: config.datePosted as SearchParams["datePosted"],
      };

      const cards = await searchIndeed(page, params, existingIds, logger);
      allCards.push(...cards);
      updateIndeedState({ searched: allCards.length });

      await page.waitForTimeout(randomDelay(3000, 6000));
    }

    updateIndeedState({
      phase: "scraping",
      total: allCards.length,
    });

    // Phase 2: Scrape each job detail page
    const savedJobIds: number[] = [];

    for (let i = 0; i < allCards.length; i++) {
      if (getIndeedState().status === "stopping") break;

      const card = allCards[i];

      // Check if already exists (might have been added by concurrent run)
      const exists = await prisma.indeedJob.findUnique({
        where: { indeedJobId: card.indeedJobId },
      });
      if (exists) {
        updateIndeedState({ scraped: getIndeedState().scraped + 1 });
        continue;
      }

      const detail = await scrapeIndeedJob(page, card.url, logger);

      if (!detail) {
        updateIndeedState({ errors: getIndeedState().errors + 1 });
        continue;
      }

      // Parse requirements
      let requirements: Awaited<ReturnType<typeof parseRequirements>>;
      try {
        requirements = await parseRequirements(
          detail.descriptionHtml,
          detail.descriptionText,
        );
      } catch {
        requirements = [];
      }

      // Save to DB
      const job = await prisma.indeedJob.create({
        data: {
          indeedJobId: card.indeedJobId,
          title: card.title,
          company: card.company,
          location: card.location,
          salary: detail.salary ?? card.salary,
          jobType: detail.jobType,
          url: card.url,
          applyUrl: detail.applyUrl,
          descriptionRaw: detail.descriptionText,
          searchQuery: configs[0].keywords,
          requirements: {
            create: requirements.map((r) => ({
              category: r.category,
              requirement: r.requirement,
              isRequired: r.isRequired,
            })),
          },
        },
      });

      savedJobIds.push(job.id);
      existingIds.add(card.indeedJobId);
      updateIndeedState({ scraped: getIndeedState().scraped + 1 });

      logger.log({
        action: "indeed_scraped",
        details: {
          title: card.title,
          company: card.company,
          requirementsFound: requirements.length,
          hasApplyUrl: !!detail.applyUrl,
        },
      });

      // Delay between pages
      await page.waitForTimeout(randomDelay(10000, 20000));
    }

    // Close browser before scoring (don't need it anymore)
    await browser.close();
    activeBrowser = null;

    // Phase 3: AI match scoring
    const hasResume = await prisma.resume.findFirst({
      where: { isActive: true },
    });

    if (hasResume && savedJobIds.length > 0) {
      updateIndeedState({ phase: "scoring" });

      for (let i = 0; i < savedJobIds.length; i++) {
        if (getIndeedState().status === "stopping") break;

        try {
          await scoreJobMatch(savedJobIds[i]);
          updateIndeedState({ scored: getIndeedState().scored + 1 });
        } catch {
          updateIndeedState({ errors: getIndeedState().errors + 1 });
        }

        // Delay between AI calls
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
    updateIndeedState({
      status: "error",
      phase: `Error: ${String(err)}`,
    });
    if (activeBrowser) {
      await activeBrowser.close().catch(() => {});
      activeBrowser = null;
    }
  }
}

export async function stopIndeedScrape(): Promise<void> {
  updateIndeedState({ status: "stopping" });
  if (activeBrowser) {
    setTimeout(async () => {
      if (activeBrowser) {
        await activeBrowser.close().catch(() => {});
        activeBrowser = null;
        updateIndeedState({ status: "idle", phase: null });
      }
    }, 10000);
  }
}
