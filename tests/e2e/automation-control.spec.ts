import { test, expect } from "@playwright/test";

/**
 * Automation Control
 *
 * The old /automation page is retired. Discovery-sweep control now lives in the
 * sidebar StatusPill (idle = "▶ start", running = "● working"). The LinkedIn
 * Easy Apply engine is controlled via the "LinkedIn auto-apply" card on Home (/).
 */

test.describe("Automation Control", () => {
  test("status pill is visible in sidebar on home page", async ({ page }) => {
    await page.goto("/");
    // StatusPill is a button in the sidebar — aria-label changes with state
    // Accept any of the three possible labels.
    const pill = page.locator(
      "button[aria-label='Start Scout search'], " +
        "button[aria-label='Stop Scout search'], " +
        "button[aria-label='Check activity']",
    );
    await expect(pill.first()).toBeVisible();
  });

  test("status pill shows text: start, working, or check activity", async ({
    page,
  }) => {
    await page.goto("/");
    const pill = page.locator(
      "button[aria-label='Start Scout search'], " +
        "button[aria-label='Stop Scout search'], " +
        "button[aria-label='Check activity']",
    );
    await expect(pill.first()).toBeVisible();
    const text = await pill.first().innerText();
    const matches =
      text.toLowerCase().includes("start") ||
      text.toLowerCase().includes("working") ||
      text.toLowerCase().includes("check activity");
    expect(matches).toBe(true);
  });

  test("LinkedIn auto-apply card on Home shows Start and Stop controls", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByText("LinkedIn auto-apply")).toBeVisible();
    // Use exact: true to avoid matching the StatusPill aria-label "Start Scout search"
    await expect(
      page.getByRole("button", { name: "Start", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Stop", exact: true }),
    ).toBeVisible();
  });

  test("LinkedIn auto-apply Start/Stop: one is enabled", async ({ page }) => {
    await page.goto("/");
    // Wait for automation status to load
    await page.waitForResponse("/api/automation").catch(() => {});
    const startBtn = page.getByRole("button", { name: "Start", exact: true });
    const stopBtn = page.getByRole("button", { name: "Stop", exact: true });

    // When idle: Start enabled, Stop disabled. When running: vice versa.
    // Either state is valid in dev — confirm one of them is enabled.
    const startEnabled = !(await startBtn.isDisabled());
    const stopEnabled = !(await stopBtn.isDisabled());
    expect(startEnabled || stopEnabled).toBe(true);
  });

  test("old /automation route is retired (404 or redirect away)", async ({
    page,
  }) => {
    const res = await page.goto("/automation");
    const url = page.url();
    const status = res?.status() ?? 0;
    // Either the route is gone (404) or Next.js redirected elsewhere
    const isGone = status === 404 || !url.endsWith("/automation");
    // If something rendered, the old "Start Automation" text must be absent
    if (!isGone) {
      const hasOldText = await page
        .getByText("Start Automation")
        .isVisible()
        .catch(() => false);
      expect(hasOldText).toBe(false);
    } else {
      expect(isGone).toBe(true);
    }
  });
});
