import { test, expect } from "@playwright/test";

test.describe("Log Viewer (/settings/logs)", () => {
  test("loads logs page at new route with correct heading", async ({ page }) => {
    await page.goto("/settings/logs");
    await expect(page.locator("h1")).toHaveText("Raw activity log");
  });

  test("shows Export for AI action (via log filters)", async ({ page }) => {
    await page.goto("/settings/logs");
    await expect(page.getByText("Export for AI")).toBeVisible();
  });

  test("shows Back to Settings link", async ({ page }) => {
    await page.goto("/settings/logs");
    await expect(page.getByRole("link", { name: /Back to Settings/ })).toBeVisible();
  });

  test("Back to Settings link navigates to /settings", async ({ page }) => {
    await page.goto("/settings/logs");
    await page.getByRole("link", { name: /Back to Settings/ }).click();
    await expect(page).toHaveURL("/settings");
  });

  test("shows entry count badge", async ({ page }) => {
    await page.goto("/settings/logs");
    // Badge shows "N entries" or "N entry"
    await expect(page.getByText(/\d+ entr/)).toBeVisible();
  });

  test("action filter is present", async ({ page }) => {
    await page.goto("/settings/logs");
    // LogFilters renders a select or filter element — look for "All" option
    await expect(page.getByText(/all/i).first()).toBeVisible();
  });
});
