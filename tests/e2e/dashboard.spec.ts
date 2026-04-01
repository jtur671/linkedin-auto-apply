import { test, expect } from "@playwright/test";

test.describe("Dashboard", () => {
  test("loads home page with stats cards", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h2")).toHaveText("Dashboard");
    await expect(page.locator("text=Total Applied")).toBeVisible();
  });

  test("sidebar navigation works", async ({ page }) => {
    await page.goto("/");
    await page.click("text=Applied Jobs");
    await expect(page).toHaveURL("/jobs");
    await page.click("text=Configuration");
    await expect(page).toHaveURL("/config");
    await page.click("text=Automation");
    await expect(page).toHaveURL("/automation");
    await page.click("text=Logs");
    await expect(page).toHaveURL("/logs");
  });
});
