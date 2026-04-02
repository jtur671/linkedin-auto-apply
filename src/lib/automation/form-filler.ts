import { Page } from "playwright";
import { matchField, ProfileAnswerRecord } from "@/lib/field-matcher";
import { findBestOption } from "@/lib/automation/dropdown-handler";

export interface FillResult {
  success: boolean;
  unfilledFields: Array<{ label: string; type: string }>;
}

export async function fillFormStep(
  page: Page,
  answers: ProfileAnswerRecord[]
): Promise<FillResult> {
  const unfilledFields: Array<{ label: string; type: string }> = [];

  // Find all form element groups using LinkedIn's stable data-test attributes
  const formGroups = await page.$$("[data-test-form-element]");

  for (const group of formGroups) {
    // Extract the label text - try multiple label selectors
    let labelText = "";
    for (const labelSel of [
      "[data-test-text-entity-list-form-title] span[aria-hidden='true']",
      "[data-test-text-entity-list-form-title]",
      "[data-test-form-builder-radio-button-form-component__title] span[aria-hidden='true']",
      "[data-test-form-builder-radio-button-form-component__title]",
      "label.artdeco-text-input--label",
      "label.fb-dash-form-element__label span[aria-hidden='true']",
      "label.fb-dash-form-element__label",
      "legend span[aria-hidden='true']",
      "legend",
      "label",
    ]) {
      const el = await group.$(labelSel);
      if (el) {
        labelText = ((await el.textContent()) ?? "").trim();
        if (labelText) break;
      }
    }

    if (!labelText) continue;

    // 1. Select dropdown (data-test-text-entity-list-form-select)
    const selectEl = await group.$("[data-test-text-entity-list-form-select]");
    if (selectEl) {
      const currentVal = await selectEl.inputValue();
      if (currentVal && currentVal !== "Select an option") continue;

      const answer = matchField(labelText, "select", answers);
      if (answer) {
        // Get option values and try to match
        const optionValues = await selectEl.$$("option");
        let matched = false;
        for (const opt of optionValues) {
          const val = ((await opt.getAttribute("value")) ?? "").trim();
          const text = ((await opt.textContent()) ?? "").trim();
          if (val === "Select an option" || !val) continue;
          const bestFromVal = findBestOption(answer, [val]);
          const bestFromText = findBestOption(answer, [text]);
          if (bestFromVal || bestFromText) {
            await selectEl.selectOption(val);
            matched = true;
            break;
          }
        }
        if (!matched) {
          // Try direct value match
          try { await selectEl.selectOption(answer); matched = true; } catch { /* not found */ }
        }
        if (!matched) unfilledFields.push({ label: labelText, type: "select" });
      } else {
        const isRequired = (await selectEl.getAttribute("required")) !== null ||
          (await selectEl.getAttribute("aria-required")) === "true";
        if (isRequired) unfilledFields.push({ label: labelText, type: "select" });
      }
      continue;
    }

    // 2. Radio buttons (data-test-form-builder-radio-button-form-component)
    const radioGroup = await group.$("[data-test-form-builder-radio-button-form-component]");
    if (radioGroup) {
      const checked = await radioGroup.$("input[type='radio']:checked");
      if (checked) continue;

      const answer = matchField(labelText, "radio", answers);
      if (answer) {
        const optionEls = await radioGroup.$$("[data-test-text-selectable-option]");
        let filled = false;
        for (const optEl of optionEls) {
          const input = await optEl.$("input[type='radio']");
          const label = await optEl.$("label");
          if (input && label) {
            const labelVal = ((await label.textContent()) ?? "").trim();
            const inputVal = (await input.getAttribute("value")) ?? "";
            if (
              labelVal.toLowerCase() === answer.toLowerCase() ||
              inputVal.toLowerCase() === answer.toLowerCase() ||
              labelVal.toLowerCase().includes(answer.toLowerCase())
            ) {
              await label.click();
              filled = true;
              break;
            }
          }
        }
        if (!filled) unfilledFields.push({ label: labelText, type: "radio" });
      } else {
        const isRequired = await radioGroup.$("input[aria-required='true']");
        if (isRequired) unfilledFields.push({ label: labelText, type: "radio" });
      }
      continue;
    }

    // 3. Text input (data-test-single-line-text-form-component)
    const textComponent = await group.$("[data-test-single-line-text-form-component]");
    if (textComponent) {
      const input = await textComponent.$("input.artdeco-text-input--input");
      if (!input) continue;

      const currentVal = await input.inputValue();
      if (currentVal) continue;

      const answer = matchField(labelText, "text", answers);
      if (answer) {
        await input.click();
        await input.fill(answer);
      } else {
        const isRequired = (await input.getAttribute("required")) !== null;
        if (isRequired) unfilledFields.push({ label: labelText, type: "text" });
      }
      continue;
    }

    // 4. Textarea
    const textarea = await group.$("textarea");
    if (textarea) {
      const currentVal = await textarea.inputValue();
      if (currentVal) continue;

      const answer = matchField(labelText, "textarea", answers);
      if (answer) {
        await textarea.click();
        await textarea.fill(answer);
      } else {
        const isRequired = (await textarea.getAttribute("required")) !== null ||
          (await textarea.getAttribute("aria-required")) === "true";
        if (isRequired) unfilledFields.push({ label: labelText, type: "textarea" });
      }
      continue;
    }

    // 5. File upload - resume is typically pre-selected on LinkedIn, skip
    const fileInput = await group.$("input[type='file']");
    if (fileInput) continue;

    // 6. Checkbox
    const checkbox = await group.$("input[type='checkbox']");
    if (checkbox) {
      const answer = matchField(labelText, "checkbox", answers);
      if (answer && answer.toLowerCase() === "yes") {
        const isChecked = await checkbox.isChecked();
        if (!isChecked) await checkbox.check();
      }
      continue;
    }

    // 7. Fallback: generic input
    const genericInput = await group.$("input[type='text'], input[type='tel'], input[type='email'], input[type='url']");
    if (genericInput) {
      const currentVal = await genericInput.inputValue();
      if (currentVal) continue;
      const answer = matchField(labelText, "text", answers);
      if (answer) {
        await genericInput.click();
        await genericInput.fill(answer);
      } else {
        const isRequired = (await genericInput.getAttribute("required")) !== null;
        if (isRequired) unfilledFields.push({ label: labelText, type: "text" });
      }
      continue;
    }

    // 8. Fallback: generic select
    const genericSelect = await group.$("select");
    if (genericSelect) {
      const currentVal = await genericSelect.inputValue();
      if (currentVal && currentVal !== "Select an option") continue;
      const answer = matchField(labelText, "select", answers);
      if (answer) {
        try { await genericSelect.selectOption(answer); } catch {
          unfilledFields.push({ label: labelText, type: "select" });
        }
      } else {
        const isRequired = (await genericSelect.getAttribute("required")) !== null;
        if (isRequired) unfilledFields.push({ label: labelText, type: "select" });
      }
    }
  }

  return { success: unfilledFields.length === 0, unfilledFields };
}
