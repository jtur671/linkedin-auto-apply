import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const COOKIE_FILE = path.join(process.cwd(), "cookies", "linkedin-session.json");
const cookies = JSON.parse(fs.readFileSync(COOKIE_FILE, "utf8"));

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
await context.addCookies(cookies);
const page = await context.newPage();

// 1. Load profile
console.log("1. Loading profile...");
await page.goto("https://www.linkedin.com/in/me/", { waitUntil: "domcontentloaded", timeout: 15000 });
await page.waitForTimeout(2000);
const profileUrl = page.url().split("?")[0].replace(/\/$/, "");
console.log(`   URL: ${profileUrl}`);

// Quick scroll for topcard
await page.evaluate("window.scrollTo(0, 2000)");
await page.waitForTimeout(1500);
await page.evaluate("window.scrollTo(0, 0)");

const mainText = await page.evaluate(() => {
  const main = document.querySelector('[data-testid="lazy-column"]');
  return main ? main.innerText : document.body.innerText;
});
console.log(`   Main profile text: ${mainText.length} chars`);

// 2. Load experience detail page
const expUrl = `${profileUrl}/details/experience/`;
console.log(`\n2. Loading experience: ${expUrl}`);
await page.goto(expUrl, { waitUntil: "domcontentloaded", timeout: 8000 });
await page.waitForTimeout(3000);
await page.evaluate("window.scrollTo(0, document.body.scrollHeight)");
await page.waitForTimeout(1500);

const expText = await page.evaluate(() => document.body.innerText);
console.log(`   Experience text: ${expText.length} chars`);

// Check what we got
const terms = ["ITPIE", "ContinuumCloud", "Royal Caribbean", "ADP", "Automation Analyst", "Senior QA"];
for (const t of terms) {
  console.log(`   ${t}: ${expText.includes(t) ? "FOUND ✓" : "MISSING ✗"}`);
}

// Save combined
const combined = mainText + "\n\n--- Experience ---\n" + expText;
fs.mkdirSync("logs", { recursive: true });
fs.writeFileSync("logs/test-combined.txt", combined);
console.log(`\n3. Combined text saved: ${combined.length} chars`);
console.log("   Check: logs/test-combined.txt");

// Screenshot
fs.mkdirSync("screenshots", { recursive: true });
await page.screenshot({ path: "screenshots/test-experience-page.png", fullPage: true });
console.log("   Screenshot: screenshots/test-experience-page.png");

await browser.close();
console.log("\nDone!");
