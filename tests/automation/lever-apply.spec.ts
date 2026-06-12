import { test, expect } from "@playwright/test";
import path from "path";
import { fillLeverForm } from "@/lib/sources/lever-browser";
import type { ApplicantProfile } from "@/lib/sources/types";

const profile: ApplicantProfile = {
  email: "jo@x.com",
  resumePath: null,
  answers: [
    { fieldLabel: "First name", fieldType: "text", answer: "Jo" },
    { fieldLabel: "Last name", fieldType: "text", answer: "Smith" },
    { fieldLabel: "Phone number", fieldType: "text", answer: "555-1234" },
    { fieldLabel: "Current company", fieldType: "text", answer: "Acme" },
  ],
};

test("fills and submits a Lever form", async ({ page }) => {
  await page.goto(`file://${path.resolve("tests/mocks/lever-form.html")}`);
  await fillLeverForm(page, profile);

  await expect(page.locator('input[name="name"]')).toHaveValue("Jo Smith");
  await expect(page.locator('input[name="email"]')).toHaveValue("jo@x.com");
  await expect(page.locator('input[name="phone"]')).toHaveValue("555-1234");
  await expect(page.locator('input[name="org"]')).toHaveValue("Acme");
  await expect(page.locator("body")).toHaveAttribute("data-submitted", "1");
});
