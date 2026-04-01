import { test, expect } from "@playwright/test";

test.describe("Job List", () => {
  test("loads jobs page", async ({ page }) => {
    await page.goto("/jobs");
    await expect(page.locator("h2")).toHaveText("Applied Jobs");
  });
});
