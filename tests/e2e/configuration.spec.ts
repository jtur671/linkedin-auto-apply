import { test, expect } from "@playwright/test";

test.describe("Settings (/settings)", () => {
  test("loads settings page at new route with correct heading", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.locator("h1")).toHaveText("Settings");
  });

  test("shows LinkedIn account section", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByText("LinkedIn account")).toBeVisible();
  });

  test("shows AI provider section", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByRole("heading", { name: "AI provider" })).toBeVisible();
  });

  test("shows Job searches section", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByText("Job searches")).toBeVisible();
  });

  test("shows Auto-fill answers section", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByText("Auto-fill answers")).toBeVisible();
  });

  test("shows Resume section", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByRole("heading", { name: "Resume" })).toBeVisible();
  });

  test("shows Appearance section with theme toggle", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByText("Appearance")).toBeVisible();
    await expect(page.getByRole("button", { name: "Light" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Dark" })).toBeVisible();
  });

  test("shows Raw activity log footer link to /settings/logs", async ({ page }) => {
    await page.goto("/settings");
    const link = page.getByRole("link", { name: /Raw activity log/ });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", "/settings/logs");
  });

  test("Raw activity log link navigates to /settings/logs", async ({ page }) => {
    await page.goto("/settings");
    await page.getByRole("link", { name: /Raw activity log/ }).click();
    await expect(page).toHaveURL("/settings/logs");
    await expect(page.locator("h1")).toHaveText("Raw activity log");
  });
});
