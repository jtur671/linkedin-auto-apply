import { test, expect } from "@playwright/test";

test.describe("Onboarding", () => {
  test("shows onboarding wizard on first visit", async ({ page }) => {
    // Note: requires empty DB to work
    await page.goto("/");
    // Should redirect to /onboarding
    await expect(page).toHaveURL("/onboarding");
    await expect(page.locator("text=LinkedIn Auto Apply")).toBeVisible();
    await expect(page.locator("text=Get Started")).toBeVisible();
  });
});
