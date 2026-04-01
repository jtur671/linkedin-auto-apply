import { Browser, BrowserContext, Page, chromium } from "playwright";
import fs from "fs";
import path from "path";
import { prisma } from "@/lib/db";
import { decrypt } from "@/lib/encryption/crypto";
import { AutomationLogger } from "@/lib/logging/logger";
import { updateState } from "./state";

const COOKIE_DIR = path.join(process.cwd(), "cookies");
const COOKIE_FILE = path.join(COOKIE_DIR, "linkedin-session.json");

export interface LoginResult {
  browser: Browser;
  context: BrowserContext;
  page: Page;
  success: boolean;
  method: "cookie" | "credentials" | "failed";
}

async function getCredentials(): Promise<{ email: string; password: string } | null> {
  const credential = await prisma.credential.findFirst();
  if (!credential) return null;
  const key = (process.env.ENCRYPTION_KEY ?? "").padEnd(64, "0").slice(0, 64);
  try {
    return { email: decrypt(credential.email, key), password: decrypt(credential.password, key) };
  } catch { return null; }
}

function savedCookiesExist(): boolean { return fs.existsSync(COOKIE_FILE); }

function loadCookies(): Array<{ name: string; value: string; domain: string; path: string }> {
  return JSON.parse(fs.readFileSync(COOKIE_FILE, "utf8"));
}

function saveCookies(cookies: Array<{ name: string; value: string; domain: string; path: string }>): void {
  fs.mkdirSync(COOKIE_DIR, { recursive: true });
  fs.writeFileSync(COOKIE_FILE, JSON.stringify(cookies, null, 2));
}

async function isLoggedIn(page: Page): Promise<boolean> {
  try {
    await page.goto("https://www.linkedin.com/feed/", { waitUntil: "domcontentloaded", timeout: 15000 });
    const url = page.url();
    return url.includes("/feed") || url.includes("/jobs");
  } catch { return false; }
}

async function loginWithCredentials(page: Page, email: string, password: string, logger: AutomationLogger): Promise<boolean> {
  try {
    await page.goto("https://www.linkedin.com/login", { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.fill("#username", email);
    await page.fill("#password", password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    const url = page.url();
    if (url.includes("checkpoint") || url.includes("challenge")) {
      logger.log({ action: "captcha_detected", details: { url } });
      updateState({ status: "captcha_required", currentJob: "2FA/CAPTCHA required - handle manually" });
      for (let i = 0; i < 24; i++) {
        await page.waitForTimeout(5000);
        const currentUrl = page.url();
        if (currentUrl.includes("/feed") || currentUrl.includes("/jobs")) return true;
      }
      return false;
    }
    return url.includes("/feed") || url.includes("/jobs");
  } catch { return false; }
}

export async function login(logger: AutomationLogger): Promise<LoginResult> {
  const browser = await chromium.launch({ headless: false });
  let context: BrowserContext;
  let page: Page;

  if (savedCookiesExist()) {
    try {
      const cookies = loadCookies();
      context = await browser.newContext();
      await context.addCookies(cookies);
      page = await context.newPage();
      if (await isLoggedIn(page)) {
        logger.log({ action: "login_cookie_reuse" });
        return { browser, context, page, success: true, method: "cookie" };
      }
      await context.close();
    } catch { /* corrupted cookies */ }
  }

  const creds = await getCredentials();
  if (!creds) {
    context = await browser.newContext();
    page = await context.newPage();
    logger.log({ action: "login_fail", reason: "No credentials configured" });
    return { browser, context, page, success: false, method: "failed" };
  }

  context = await browser.newContext();
  page = await context.newPage();
  const success = await loginWithCredentials(page, creds.email, creds.password, logger);

  if (success) {
    const cookies = await context.cookies();
    saveCookies(cookies);
    logger.log({ action: "login_success" });
    return { browser, context, page, success: true, method: "credentials" };
  }

  logger.log({ action: "login_fail", reason: "Credential login failed" });
  return { browser, context, page, success: false, method: "failed" };
}
