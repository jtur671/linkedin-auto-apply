import { test, expect } from "@playwright/test";
import path from "path";

test("fills login form on mock page", async ({ page }) => {
  await page.goto(`file://${path.resolve("tests/mocks/linkedin-login.html")}`);
  await page.fill("#username", "test@example.com");
  await page.fill("#password", "password123");
  expect(await page.inputValue("#username")).toBe("test@example.com");
  expect(await page.inputValue("#password")).toBe("password123");
});
