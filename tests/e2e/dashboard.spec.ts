import { test, expect } from "@playwright/test";

test.describe("Dashboard (Home command center)", () => {
  test("hero shows the four stat labels", async ({ page }) => {
    await page.goto("/");
    const hero = page.locator('header[aria-label="Today at a glance"]');
    await expect(hero).toBeVisible();
    await expect(hero.getByText("To review")).toBeVisible();
    await expect(hero.getByText("Applied today")).toBeVisible();
    await expect(hero.getByText("Found today")).toBeVisible();
    await expect(hero.getByText("Sources active")).toBeVisible();
  });

  test("hero shows the Run-a-sweep control", async ({ page }) => {
    await page.goto("/");
    // Labeled by aria-label; copy varies by state (run / working / check activity).
    const sweep = page.getByRole("button", {
      name: /Run a sweep|Stop the sweep|Check activity/,
    });
    await expect(sweep.first()).toBeVisible();
  });

  test("Needs you region renders (cards or first-run prompt)", async ({
    page,
  }) => {
    await page.goto("/");
    const needsYou = page.locator('section[aria-label="Needs you"]');
    await expect(needsYou).toBeVisible();
    await expect(
      needsYou.getByRole("heading", { name: "Needs you" }),
    ).toBeVisible();
  });

  test("recap zone shows Recently applied and Activity", async ({ page }) => {
    await page.goto("/");
    const recap = page.locator('section[aria-label="Recap"]');
    await expect(recap).toBeVisible();
    await expect(
      recap.getByRole("heading", { name: "Recently applied" }),
    ).toBeVisible();
    await expect(
      recap.getByRole("heading", { name: "While you were away" }),
    ).toBeVisible();
  });

  test("shows LinkedIn auto-apply control", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("LinkedIn auto-apply")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Start", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Stop", exact: true }),
    ).toBeVisible();
  });

  test("sidebar shows Scout brand and nav links", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Scout").first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Home" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Jobs" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Profile" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Settings" })).toBeVisible();
  });

  test("sidebar navigation works", async ({ page }) => {
    await page.goto("/");
    // Client-side nav: wait for hydration, then click links by role and wait
    // for each URL (toHaveURL can race the router under parallel load).
    const nav = (name: string) =>
      page.getByRole("link", { name, exact: true });
    await expect(nav("Jobs")).toBeVisible();

    await nav("Jobs").click();
    await page.waitForURL(/\/jobs/);
    await nav("Settings").click();
    await page.waitForURL("**/settings");
    await nav("Profile").click();
    await page.waitForURL("**/profile");
    await nav("Home").click();
    await page.waitForURL((url) => url.pathname === "/");
  });

  test("status pill is visible in sidebar", async ({ page }) => {
    await page.goto("/");
    const pill = page.getByRole("button", {
      name: /Start Scout search|Stop Scout search|Check activity/,
    });
    await expect(pill).toBeVisible();
  });
});
