import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const COOKIE_FILE = path.join(process.cwd(), "cookies", "linkedin-session.json");

async function testScrape() {
  const cookies = JSON.parse(fs.readFileSync(COOKIE_FILE, "utf8"));
  console.log(`Loaded ${cookies.length} cookies`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  await context.addCookies(cookies);
  const page = await context.newPage();

  // Load profile
  console.log("Navigating to profile...");
  await page.goto("https://www.linkedin.com/in/me/", { waitUntil: "domcontentloaded", timeout: 15000 });
  const profileUrl = page.url().replace(/\/$/, "");
  console.log(`Profile URL: ${profileUrl}`);

  // Screenshot main profile
  await page.screenshot({ path: "screenshots/test-1-profile.png", fullPage: true });
  console.log("Screenshot 1: main profile saved");

  // Try experience detail page
  const expUrl = `${profileUrl}/details/experience/`;
  console.log(`Navigating to: ${expUrl}`);
  await page.goto(expUrl, { waitUntil: "domcontentloaded", timeout: 8000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: "screenshots/test-2-experience.png", fullPage: true });
  console.log("Screenshot 2: experience page saved");

  const expText = await page.evaluate(() => document.body.innerText);
  console.log(`Experience page text length: ${expText.length}`);
  console.log("First 500 chars:", expText.substring(0, 500));
  console.log("\n--- Checking for job titles ---");
  for (const term of ["ITPIE", "ContinuumCloud", "Royal Caribbean", "ADP", "Quality Assurance", "Automation Analyst"]) {
    const found = expText.includes(term);
    console.log(`  ${term}: ${found ? "FOUND" : "NOT FOUND"}`);
  }

  // Save full text
  fs.writeFileSync("logs/test-experience-text.txt", expText, "utf8");
  console.log("Full experience text saved to logs/test-experience-text.txt");

  await browser.close();
  console.log("Done");
}

testScrape().catch((e) => { console.error("Error:", e.message); process.exit(1); });
