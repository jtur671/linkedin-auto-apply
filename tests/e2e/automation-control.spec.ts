import { test, expect } from "@playwright/test";

test.describe("Automation Control", () => {
  test("shows idle status by default", async ({ page }) => {
    await page.goto("/automation");
    await expect(page.locator("text=Idle")).toBeVisible();
    await expect(page.locator("text=Start Automation")).toBeVisible();
  });
});
