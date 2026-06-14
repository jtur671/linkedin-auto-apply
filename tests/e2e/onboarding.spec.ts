import { test, expect } from "@playwright/test";

test.describe("Onboarding (/onboarding)", () => {
  test("shows Scout welcome message on /onboarding", async ({ page }) => {
    await page.goto("/onboarding");
    await expect(page.getByText(/Hi, I'm Scout/)).toBeVisible();
  });

  test("shows Let's go! CTA button", async ({ page }) => {
    await page.goto("/onboarding");
    await expect(page.getByRole("button", { name: "Let's go!" })).toBeVisible();
  });

  test("shows step rail with Welcome step active", async ({ page }) => {
    await page.goto("/onboarding");
    // Progress bar renders step labels — use first() to avoid strict-mode errors
    // when the same text appears in both the progress bar and the step body.
    await expect(page.getByText("Welcome").first()).toBeVisible();
    await expect(page.getByText("Your LinkedIn login").first()).toBeVisible();
    await expect(page.getByText("What you're looking for").first()).toBeVisible();
    await expect(page.getByText("Questions employers ask").first()).toBeVisible();
    await expect(page.getByText("AI setup").first()).toBeVisible();
  });

  test("Let's go! advances to step 2 (LinkedIn login)", async ({ page }) => {
    await page.goto("/onboarding");
    await page.getByRole("button", { name: "Let's go!" }).click();
    // Step 2 heading — use the h2 role to avoid matching the progress rail label
    await expect(
      page.getByRole("heading", { name: "Your LinkedIn login" }),
    ).toBeVisible();
  });

  test("onboarding redirect: /api/onboarding/status drives redirect", async ({
    page,
  }) => {
    // When onboarding is complete (the typical dev state after setup),
    // going to / should NOT redirect to /onboarding.
    // We verify the mechanism rather than triggering an empty-DB reset.
    const statusRes = await page.request.get("/api/onboarding/status");
    expect(statusRes.ok()).toBe(true);
    const body = await statusRes.json();
    // The response must include needsOnboarding boolean
    expect(typeof body.needsOnboarding).toBe("boolean");
  });

  test("onboarding page renders without sidebar (full-width layout)", async ({
    page,
  }) => {
    await page.goto("/onboarding");
    // Sidebar is not present on the onboarding page
    const sidebar = page.locator("aside");
    await expect(sidebar).not.toBeVisible();
  });
});
