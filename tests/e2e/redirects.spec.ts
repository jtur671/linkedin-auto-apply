import { test, expect } from "@playwright/test";

/**
 * Legacy route redirects
 *
 * Verifies that every old URL still lands on the correct Scout page.
 * All redirects are 307 Temporary (defined in next.config.ts).
 */

test.describe("Legacy redirects", () => {
  test("/indeed → /jobs?tab=found", async ({ page }) => {
    await page.goto("/indeed");
    await expect(page).toHaveURL(/\/jobs/);
    await expect(page).toHaveURL(/tab=found/);
    await expect(page.locator("h1")).toContainText("Jobs");
  });

  test("/seo → /profile", async ({ page }) => {
    await page.goto("/seo");
    await expect(page).toHaveURL("/profile");
    await expect(page.locator("h1")).toHaveText("Profile");
  });

  test("/config → /settings", async ({ page }) => {
    await page.goto("/config");
    await expect(page).toHaveURL("/settings");
    await expect(page.locator("h1")).toHaveText("Settings");
  });

  test("/logs → /settings/logs", async ({ page }) => {
    await page.goto("/logs");
    await expect(page).toHaveURL("/settings/logs");
    await expect(page.locator("h1")).toHaveText("Raw activity log");
  });

  test("/review → / (home)", async ({ page }) => {
    await page.goto("/review");
    await expect(page).toHaveURL(/\//);
    await expect(page.locator("h1")).toContainText("here's your morning");
  });

  test("/indeed/insights → /jobs", async ({ page }) => {
    await page.goto("/indeed/insights");
    await expect(page).toHaveURL(/\/jobs/);
    await expect(page.locator("h1")).toContainText("Jobs");
  });
});
