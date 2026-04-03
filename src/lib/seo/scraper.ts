import { chromium, Browser } from "playwright";
import fs from "fs";
import path from "path";
import type { ProfileData } from "@/lib/seo/types";

const COOKIE_FILE = path.join(process.cwd(), "cookies", "linkedin-session.json");

let scrapeInProgress = false;

function loadCookies(): Array<{ name: string; value: string; domain: string; path: string }> | null {
  try {
    if (!fs.existsSync(COOKIE_FILE)) return null;
    return JSON.parse(fs.readFileSync(COOKIE_FILE, "utf8"));
  } catch {
    return null;
  }
}

export async function scrapeProfile(): Promise<ProfileData> {
  if (scrapeInProgress) {
    throw new Error("A profile scrape is already in progress");
  }

  const cookies = loadCookies();
  if (!cookies || cookies.length === 0) {
    throw new Error("No LinkedIn session cookies found. Please run the automation login first.");
  }

  scrapeInProgress = true;
  let browser: Browser | null = null;

  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    await context.addCookies(cookies);
    const page = await context.newPage();

    await page.goto("https://www.linkedin.com/in/me/", {
      waitUntil: "domcontentloaded",
      timeout: 15000,
    });

    const url = page.url();
    if (url.includes("/login") || url.includes("/authwall")) {
      throw new Error("LinkedIn session expired. Please re-authenticate via the automation login.");
    }

    // Wait for profile to load
    await page.waitForSelector('section[componentkey*="Topcard"]', { timeout: 12000 }).catch(() => null);
    await page.waitForLoadState("networkidle").catch(() => null);

    // Quick scroll of main profile page for topcard + about
    await page.evaluate("window.scrollTo(0, 2000)");
    await page.waitForTimeout(1500);

    // Scroll back to top for main page text
    await page.evaluate("window.scrollTo(0, 0)");
    await page.waitForTimeout(500);

    // Extract the full visible text of the profile — this is the primary data source
    // The AI will parse sections from this raw text
    const rawProfileText = await page.evaluate(() => {
      const main = document.querySelector('[data-testid="lazy-column"]') as HTMLElement | null;
      return main ? main.innerText : document.body.innerText;
    });

    // Also try to extract a few high-confidence fields for structured display
    const name = await page.$eval(
      'section[componentkey*="Topcard"] h2',
      (el) => el.textContent?.trim() ?? ""
    ).catch(() => "");

    // Headline: first substantial p in topcard
    const headline = await page.evaluate(() => {
      const section = document.querySelector('section[componentkey*="Topcard"]');
      if (!section) return "";
      const ps = section.querySelectorAll("p");
      for (const p of ps) {
        const text = p.textContent?.trim() ?? "";
        if (text.length > 20 && !text.includes("connections") && !text.includes("Contact info")) {
          return text;
        }
      }
      return "";
    });

    // About section text
    const about = await page.$eval(
      'section[componentkey*="About"] span[data-testid="expandable-text-box"]',
      (el) => el.textContent?.trim() ?? ""
    ).catch(() => "");

    // Location
    const location = await page.evaluate(() => {
      const section = document.querySelector('section[componentkey*="Topcard"]');
      if (!section) return "";
      const ps = section.querySelectorAll("p");
      for (const p of ps) {
        const text = p.textContent?.trim() ?? "";
        if (/united states|canada|florida|california|new york|texas|remote/i.test(text) && text.length < 80) {
          return text;
        }
      }
      return "";
    });

    // Top skills from the about section's skill summary
    const topSkills = await page.evaluate(() => {
      const aboutSection = document.querySelector('section[componentkey*="About"]');
      if (!aboutSection) return [] as string[];
      const text = aboutSection.textContent ?? "";
      const lines = text.split("\n");
      for (const line of lines) {
        if (line.includes(" • ") && line.split(" • ").length >= 3) {
          return line.split(" • ").map((s) => s.trim()).filter(Boolean);
        }
      }
      return [] as string[];
    });

    // Company and education from topcard
    const { currentCompany, education } = await page.evaluate(() => {
      const section = document.querySelector('section[componentkey*="Topcard"]');
      if (!section) return { currentCompany: "", education: "" };
      const ps = section.querySelectorAll("p");
      for (const p of ps) {
        const text = p.textContent?.trim() ?? "";
        if (text.includes("·") && text.length < 80 && !text.includes("connections")) {
          const parts = text.split("·").map((s) => s.trim());
          return { currentCompany: parts[0] || "", education: parts[1] || "" };
        }
      }
      return { currentCompany: "", education: "" };
    });

    // LinkedIn doesn't render sections below Activity in headless mode on the profile page.
    // Instead, click each "Show all" link on the profile to open detail overlays,
    // or navigate directly to detail pages and grab the page body text.
    // Strip query params and trailing slash to get clean profile URL
    const profileUrl = page.url().split("?")[0].replace(/\/$/, "");
    const detailSections = ["experience", "education", "skills", "certifications", "projects", "courses", "organizations"];

    const detailTexts: string[] = [];
    for (const section of detailSections) {
      try {
        // Navigate to the detail page directly with a fresh full-page load
        const detailUrl = `${profileUrl}/details/${section}/`;
        await page.goto(detailUrl, { waitUntil: "domcontentloaded", timeout: 8000 });
        await page.waitForTimeout(3000);

        // Scroll down to load lazy content
        await page.evaluate("window.scrollTo(0, document.body.scrollHeight)");
        await page.waitForTimeout(1500);
        await page.evaluate("window.scrollTo(0, document.body.scrollHeight)");
        await page.waitForTimeout(1000);

        // Grab ALL text from the page body (not just main — detail pages may use different containers)
        const pageText = await page.evaluate(() => document.body.innerText);

        if (pageText.trim().length > 200) {
          detailTexts.push(`\n--- ${section.charAt(0).toUpperCase() + section.slice(1)} ---\n${pageText.trim()}`);
        }
      } catch {
        // Page may not exist — skip
      }
    }

    // If detail pages didn't work (LinkedIn may redirect), try the alternative:
    // Go back to profile and use page.content() to get the full HTML and extract text from it
    if (detailTexts.length === 0) {
      await page.goto(profileUrl, { waitUntil: "domcontentloaded", timeout: 10000 });
      await page.waitForTimeout(3000);

      // Get the full page HTML and extract all innerText from expandable text boxes
      const allExpandableText = await page.evaluate(() => {
        const boxes = document.querySelectorAll('span[data-testid="expandable-text-box"]');
        const texts: string[] = [];
        boxes.forEach((box) => {
          const text = (box as HTMLElement).innerText?.trim();
          if (text && text.length > 20) texts.push(text);
        });

        // Also get all section headers (h2) and their following content
        const h2s = document.querySelectorAll("h2");
        h2s.forEach((h2) => {
          const section = h2.closest("section");
          if (section) {
            const sectionText = (section as HTMLElement).innerText?.trim();
            if (sectionText && sectionText.length > 30) {
              texts.push(`[${h2.textContent?.trim()}]\n${sectionText}`);
            }
          }
        });

        return texts;
      });

      if (allExpandableText.length > 0) {
        detailTexts.push("\n--- Extracted Sections ---\n" + allExpandableText.join("\n\n"));
      }
    }

    // Combine main profile text with detail page text
    const fullProfileText = rawProfileText + "\n" + detailTexts.join("\n");

    // Take debug screenshot of last page visited
    const screenshotDir = path.join(process.cwd(), "screenshots");
    fs.mkdirSync(screenshotDir, { recursive: true });
    await page.screenshot({
      path: path.join(screenshotDir, "seo-scrape-debug.png"),
      fullPage: true,
    }).catch(() => {});

    // Debug: save raw text so we can inspect what was captured
    const debugPath = path.join(process.cwd(), "logs", "seo-scrape-debug.txt");
    fs.mkdirSync(path.dirname(debugPath), { recursive: true });
    fs.writeFileSync(debugPath, fullProfileText, "utf8");

    return {
      name,
      headline,
      about,
      location,
      currentCompany,
      education,
      topSkills,
      experience: [],
      rawProfileText: fullProfileText,
    };
  } finally {
    scrapeInProgress = false;
    if (browser) {
      await browser.close();
    }
  }
}
