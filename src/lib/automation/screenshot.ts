import { Page } from "playwright";
import path from "path";
import fs from "fs";

const SCREENSHOT_DIR = path.join(process.cwd(), "screenshots");

export async function captureScreenshot(page: Page, label: string): Promise<string> {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const safeName = label.replace(/[^a-zA-Z0-9-]/g, "-").slice(0, 60);
  const filename = `${timestamp}-${safeName}.png`;
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, filename), fullPage: false });
  return `screenshots/${filename}`;
}
