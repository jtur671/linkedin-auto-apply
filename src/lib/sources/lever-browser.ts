import { chromium, type Page } from "playwright";
import { matchField } from "@/lib/field-matcher";
import type { ApplicantProfile, ApplyResult, NormalizedJob } from "./types";

async function fillIf(page: Page, selector: string, value: string | null) {
  if (value) await page.fill(selector, value);
}

/** Fills a Lever-hosted application form on an already-loaded page.
 *
 * NOTE: The real Lever DOM selectors below are verified during the manual live
 * check. The automated spec runs against a local mock only. Same approach as
 * the Greenhouse browser filler.
 */
// Submits after filling the standard fields. The browser fallback covers the
// standard Lever fields only; custom per-job questions are not filled here.
export async function fillLeverForm(page: Page, profile: ApplicantProfile): Promise<void> {
  const get = (label: string) => matchField(label, "text", profile.answers);

  // Lever uses a single full-name field instead of separate first/last fields.
  const firstName = get("first name");
  const lastName = get("last name");
  const parts = [firstName, lastName].filter((p): p is string => p !== null);
  if (parts.length > 0) {
    await page.fill('input[name="name"]', parts.join(" "));
  }

  await fillIf(page, 'input[name="email"]', profile.email);
  await fillIf(page, 'input[name="phone"]', get("phone number"));
  await fillIf(page, 'input[name="org"]', get("current company"));

  if (profile.resumePath) {
    await page.setInputFiles('input[name="resume"]', profile.resumePath).catch((err) => {
      console.warn("[lever] resume upload skipped:", err);
    });
  }

  // Try the specific Lever submit button id first, then fall back to any submit button.
  const submitted = await page.locator("#btn-submit").count();
  if (submitted > 0) {
    await page.click("#btn-submit");
  } else {
    await page.click('button[type="submit"]');
  }
}

/** Launches a browser, navigates to the job's apply URL, fills, submits. */
export async function browserApplyLever(
  job: NormalizedJob,
  profile: ApplicantProfile,
): Promise<ApplyResult> {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    // Lever's posting page URL + "/apply" is the application form. Avoid doubling it.
    const base = job.applyUrl ?? job.url;
    const applyUrl = base.endsWith("/apply") ? base : `${base}/apply`;
    await page.goto(applyUrl, { waitUntil: "domcontentloaded" });
    await fillLeverForm(page, profile);
    return { outcome: "submitted", method: "browser" };
  } catch (e) {
    return { outcome: "failed", method: "browser", message: String(e) };
  } finally {
    await browser.close();
  }
}
