import { test, expect } from "@playwright/test";
import path from "path";

test("handles missing Easy Apply button", async ({ page }) => {
  await page.goto(`file://${path.resolve("tests/mocks/linkedin-login.html")}`);
  const btn = await page.$(".jobs-apply-button");
  expect(btn).toBeNull();
});

test("handles dropdowns and radio buttons", async ({ page }) => {
  await page.goto(`file://${path.resolve("tests/mocks/easy-apply-with-dropdowns.html")}`);
  await page.click(".jobs-apply-button");
  await page.click('label:has-text("Yes")');
  expect(await page.isChecked('input[value="yes"]')).toBe(true);
  await page.selectOption("select", { label: "Senior level (6+ years)" });
});
