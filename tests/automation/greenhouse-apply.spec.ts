import { test, expect } from "@playwright/test";
import path from "path";
import { fillGreenhouseForm } from "@/lib/sources/greenhouse-browser";
import type { ApplicantProfile } from "@/lib/sources/types";

const profile: ApplicantProfile = {
  email: "jo@x.com",
  resumePath: null,
  answers: [
    { fieldLabel: "First name", fieldType: "text", answer: "Jo" },
    { fieldLabel: "Last name", fieldType: "text", answer: "Smith" },
    { fieldLabel: "Phone number", fieldType: "text", answer: "555-1234" },
  ],
};

test("fills and submits a Greenhouse form", async ({ page }) => {
  await page.goto(`file://${path.resolve("tests/mocks/greenhouse-form.html")}`);
  await fillGreenhouseForm(page, profile);

  await expect(page.locator("#first_name")).toHaveValue("Jo");
  await expect(page.locator("#last_name")).toHaveValue("Smith");
  await expect(page.locator("#email")).toHaveValue("jo@x.com");
  await expect(page.locator("#phone")).toHaveValue("555-1234");
  await expect(page.locator("body")).toHaveAttribute("data-submitted", "1");
});
