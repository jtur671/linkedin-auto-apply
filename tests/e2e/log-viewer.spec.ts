import { test, expect } from "@playwright/test";

test.describe("Log Viewer", () => {
  test("loads logs page", async ({ page }) => {
    await page.goto("/logs");
    await expect(page.locator("h2")).toHaveText("Automation Logs");
    await expect(page.locator("text=Export for AI")).toBeVisible();
  });
});
