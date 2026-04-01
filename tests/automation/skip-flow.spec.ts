import { test, expect } from "@playwright/test";
import path from "path";

test("detects unknown required field", async ({ page }) => {
  await page.goto(`file://${path.resolve("tests/mocks/easy-apply-unknown-fields.html")}`);
  await page.click(".jobs-apply-button");
  await page.waitForSelector("#modal", { state: "visible" });
  const textarea = page.locator(".jobs-easy-apply-form-section__grouping textarea");
  expect(await textarea.getAttribute("required")).not.toBeNull();
  expect(await textarea.inputValue()).toBe("");
});
