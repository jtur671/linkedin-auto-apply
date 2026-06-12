import { chromium, type Browser, type Page } from "playwright";
import { matchField } from "@/lib/field-matcher";
import type { ApplicantProfile, ApplyResult, NormalizedJob } from "./types";

async function fillIf(page: Page, selector: string, value: string | null) {
  if (value) await page.fill(selector, value);
}

/** Fills a Greenhouse-hosted application form on an already-loaded page. */
export async function fillGreenhouseForm(page: Page, profile: ApplicantProfile): Promise<void> {
  const get = (label: string) => matchField(label, "text", profile.answers);
  await fillIf(page, "#first_name", get("first name"));
  await fillIf(page, "#last_name", get("last name"));
  await fillIf(page, "#email", profile.email);
  await fillIf(page, "#phone", get("phone number"));
  if (profile.resumePath) {
    await page.setInputFiles("#resume", profile.resumePath).catch((err) => {
      console.warn("[greenhouse] resume upload skipped:", err);
    });
  }
  // Submits after filling the standard fields. M1's browser fallback covers the
  // standard Greenhouse fields only; custom per-board questions are not filled here.
  await page.click('#application_form button[type="submit"]');
}

/** Launches a browser, navigates the job's apply URL, fills, submits. */
export async function browserApplyGreenhouse(
  job: NormalizedJob,
  profile: ApplicantProfile,
): Promise<ApplyResult> {
  // launch() lives inside the try so a Playwright failure (missing browser
  // binary etc.) returns "failed" instead of violating the never-throws contract.
  let browser: Browser | undefined;
  try {
    browser = await chromium.launch();
    const page = await browser.newPage();
    await page.goto(job.applyUrl ?? job.url, { waitUntil: "domcontentloaded" });
    await fillGreenhouseForm(page, profile);
    return { outcome: "submitted", method: "browser" };
  } catch (e) {
    return { outcome: "failed", method: "browser", message: String(e) };
  } finally {
    await browser?.close();
  }
}
