import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const COOKIE_FILE = path.join(process.cwd(), "cookies", "linkedin-session.json");
const cookies = JSON.parse(fs.readFileSync(COOKIE_FILE, "utf8"));

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
await context.addCookies(cookies);
const page = await context.newPage();

console.log("Loading profile...");
await page.goto("https://www.linkedin.com/in/me/", { waitUntil: "domcontentloaded", timeout: 15000 });
const profileUrl = page.url().split("?")[0].replace(/\/$/, "");

console.log(`Loading skills: ${profileUrl}/details/skills/`);
await page.goto(`${profileUrl}/details/skills/`, { waitUntil: "domcontentloaded", timeout: 8000 });
await page.waitForTimeout(3000);

// Click "Load more" repeatedly
for (let i = 0; i < 5; i++) {
  await page.evaluate("window.scrollTo(0, document.body.scrollHeight)");
  await page.waitForTimeout(1000);
  const btn = await page.$('button:has-text("Load more"), button:has-text("Show more")');
  if (btn) {
    console.log(`Clicking Load more (attempt ${i + 1})...`);
    await btn.click().catch(() => {});
    await page.waitForTimeout(1500);
  } else {
    console.log(`No more Load more buttons after ${i} clicks`);
    break;
  }
}

const text = await page.evaluate(() => document.body.innerText);
// Extract skill names (lines that look like skill names)
const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
const skills = lines.filter(l =>
  l.length > 1 && l.length < 40 &&
  !["Home", "My Network", "Jobs", "Messaging", "Notifications", "Me", "For Business", "All", "Industry Knowledge", "Tools & Technologies", "Interpersonal Skills", "Other Skills", "Skills", "Resources", "Enhance profile", "Add section", "Open to", "Load more", "Show more", "0 notifications", "Skip to main content", "Who your viewers also viewed", "Private to you", "View", "About", "Accessibility", "Talent Solutions", "Community Guidelines", "Careers", "Marketing Solutions", "Privacy & Terms", "Ad Choices"].includes(l) &&
  !l.startsWith("Reactivate") && !l.startsWith("jason-tur") && !l.startsWith("Jason Tur") && !l.includes("notifications")
);

const uniqueSkills = [...new Set(skills)];
console.log(`\nFound ${uniqueSkills.length} unique skills:`);
uniqueSkills.forEach(s => console.log(`  - ${s}`));

await page.screenshot({ path: "screenshots/test-skills.png", fullPage: true });
console.log("\nScreenshot saved: screenshots/test-skills.png");

await browser.close();
