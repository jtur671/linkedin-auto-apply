import { test, expect } from "@playwright/test";
import path from "path";

test("completes single-step application", async ({ page }) => {
  await page.goto(`file://${path.resolve("tests/mocks/easy-apply-single-step.html")}`);
  await page.click(".jobs-apply-button");
  await page.waitForSelector("#modal", { state: "visible" });
  await page.locator(".jobs-easy-apply-form-section__grouping input").fill("555-123-4567");
  await page.click('[aria-label="Submit application"]');
});

test("completes multi-step application", async ({ page }) => {
  await page.goto(`file://${path.resolve("tests/mocks/easy-apply-multi-step.html")}`);
  await page.click(".jobs-apply-button");
  await page.locator("#s1 input").fill("555-123-4567");
  await page.click('[aria-label="Continue to next step"]');
  await page.waitForSelector("#s2", { state: "visible" });
  await page.selectOption("#s2 select", { label: "7-9" });
  await page.click('[aria-label="Submit application"]');
});
