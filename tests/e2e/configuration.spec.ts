import { test, expect } from "@playwright/test";

test.describe("Configuration", () => {
  test("page loads with all sections", async ({ page }) => {
    await page.goto("/config");
    await expect(page.locator("h2")).toHaveText("Configuration");
    await expect(page.locator("text=LinkedIn Credentials")).toBeVisible();
    await expect(page.locator("text=Search Configurations")).toBeVisible();
    await expect(page.locator("text=Profile Answers")).toBeVisible();
  });
});
