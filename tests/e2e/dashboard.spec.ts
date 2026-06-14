import { test, expect } from "@playwright/test";

test.describe("Dashboard (Home)", () => {
  test("loads home page with correct heading", async ({ page }) => {
    await page.goto("/");
    // The heading is an h1 with emoji — match by contains
    await expect(page.locator("h1")).toContainText("Your picks today");
  });

  test("shows stat chips in the right column", async ({ page }) => {
    await page.goto("/");
    // StatChip labels from the new home page
    await expect(page.getByText("Applied today")).toBeVisible();
    await expect(page.getByText("This week")).toBeVisible();
  });

  test("shows LinkedIn auto-apply card", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("LinkedIn auto-apply")).toBeVisible();
    // Start/Stop buttons are always rendered (Start enabled when idle)
    await expect(page.getByRole("button", { name: "Start", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Stop", exact: true })).toBeVisible();
  });

  test("shows empty state or job cards (structure check)", async ({ page }) => {
    await page.goto("/");
    // Either an empty state or the picks section is present
    const picks = page.locator('section[aria-label="Your picks"]');
    await expect(picks).toBeVisible();
  });

  test("sidebar shows Scout brand and nav links", async ({ page }) => {
    await page.goto("/");
    // Brand name in sidebar
    await expect(page.getByText("Scout").first()).toBeVisible();
    // Nav links
    await expect(page.getByRole("link", { name: "Home" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Jobs" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Profile" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Settings" })).toBeVisible();
  });

  test("sidebar navigation works", async ({ page }) => {
    await page.goto("/");
    await page.click("text=Jobs");
    await expect(page).toHaveURL(/\/jobs/);
    await page.click("text=Settings");
    await expect(page).toHaveURL("/settings");
    await page.click("text=Profile");
    await expect(page).toHaveURL("/profile");
    await page.click("text=Home");
    await expect(page).toHaveURL("/");
  });

  test("status pill is visible in sidebar", async ({ page }) => {
    await page.goto("/");
    // Idle pill shows "▶ start" or running shows "● working"
    const pill = page.getByRole("button", {
      name: /Start Scout search|Stop Scout search|Check activity/,
    });
    await expect(pill).toBeVisible();
  });
});
