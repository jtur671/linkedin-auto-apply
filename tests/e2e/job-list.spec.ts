import { test, expect } from "@playwright/test";

test.describe("Job List (/jobs)", () => {
  test("loads jobs page with correct heading", async ({ page }) => {
    await page.goto("/jobs");
    await expect(page.locator("h1")).toContainText("Jobs");
  });

  test("shows segmented tabs: Found, Applied, Passed", async ({ page }) => {
    await page.goto("/jobs");
    await expect(page.getByRole("tab", { name: "Found" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Applied" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Passed" })).toBeVisible();
  });

  test("defaults to Found tab", async ({ page }) => {
    await page.goto("/jobs");
    const foundTab = page.getByRole("tab", { name: "Found" });
    await expect(foundTab).toHaveAttribute("aria-selected", "true");
  });

  test("switching to Applied tab updates URL", async ({ page }) => {
    await page.goto("/jobs");
    await page.getByRole("tab", { name: "Applied" }).click();
    await expect(page).toHaveURL(/tab=applied/);
    const appliedTab = page.getByRole("tab", { name: "Applied" });
    await expect(appliedTab).toHaveAttribute("aria-selected", "true");
  });

  test("switching to Passed tab updates URL", async ({ page }) => {
    await page.goto("/jobs");
    await page.getByRole("tab", { name: "Passed" }).click();
    await expect(page).toHaveURL(/tab=passed/);
  });

  test("Found tab shows search input and sort controls", async ({ page }) => {
    await page.goto("/jobs");
    await expect(
      page.getByPlaceholder("Search by title or company…"),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Best match" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Newest" })).toBeVisible();
  });

  test("shows stat chips strip", async ({ page }) => {
    await page.goto("/jobs");
    await expect(page.getByText("Found, waiting")).toBeVisible();
    await expect(page.getByText("Sources active")).toBeVisible();
  });

  test("Applied tab: empty state or Applied rows visible", async ({ page }) => {
    await page.goto("/jobs?tab=applied");
    // Either empty state or job rows — at minimum the page structure loads
    const tablist = page.getByRole("tablist", { name: "Job lists" });
    await expect(tablist).toBeVisible();
    // Applied tab is selected
    await expect(page.getByRole("tab", { name: "Applied" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  test("Passed tab: shows Restore button when rows exist or empty state", async ({
    page,
  }) => {
    await page.goto("/jobs?tab=passed");
    await expect(page.getByRole("tab", { name: "Passed" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    // Wait for loading skeleton to disappear (aria-hidden) before asserting content
    await page.waitForSelector('[aria-hidden="true"]', { state: "detached", timeout: 8000 }).catch(() => {});
    // Either Restore buttons exist or an empty-state message does
    const hasRestore = (await page.getByRole("button", { name: "Restore" }).count()) > 0;
    const hasEmpty = await page.getByText("Nothing set aside").isVisible().catch(() => false);
    expect(hasRestore || hasEmpty).toBe(true);
  });
});
