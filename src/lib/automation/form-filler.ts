import { Page, ElementHandle } from "playwright";
import { matchField, ProfileAnswerRecord } from "@/lib/field-matcher";
import { findBestOption } from "@/lib/automation/dropdown-handler";

export interface FillResult {
  success: boolean;
  unfilledFields: Array<{ label: string; type: string }>;
}

async function fillTextField(page: Page, input: ElementHandle, answer: string): Promise<void> {
  await input.click();
  await input.fill("");
  for (const char of answer) { await input.type(char, { delay: Math.random() * 50 + 20 }); }
}

async function fillSelectField(page: Page, select: ElementHandle, answer: string): Promise<boolean> {
  const options = await select.$eval("select", (el) => {
    return Array.from((el as HTMLSelectElement).options).map((o) => o.textContent?.trim() ?? "").filter(Boolean);
  }).catch(async () => {
    return await select.$$eval("option", (opts: HTMLOptionElement[]) => opts.map((o) => o.textContent?.trim() ?? "").filter(Boolean));
  });
  const best = findBestOption(answer, options);
  if (!best) return false;
  await select.selectOption({ label: best });
  return true;
}

async function fillLinkedInDropdown(page: Page, container: ElementHandle, answer: string): Promise<boolean> {
  const input = await container.$("input");
  if (!input) return false;
  await input.click();
  await input.fill(answer);
  await page.waitForTimeout(1000);
  const options = await page.$$(".basic-typeahead__selectable, [role='option']");
  if (options.length === 0) return false;
  const optionTexts: string[] = [];
  for (const opt of options) { optionTexts.push((await opt.textContent())?.trim() ?? ""); }
  const best = findBestOption(answer, optionTexts);
  const idx = best ? optionTexts.indexOf(best) : 0;
  await options[idx >= 0 ? idx : 0].click();
  return true;
}

async function fillRadioField(page: Page, fieldset: ElementHandle, answer: string): Promise<boolean> {
  const labels = await fieldset.$$("label");
  for (const label of labels) {
    const text = (await label.textContent())?.trim().toLowerCase() ?? "";
    if (text === answer.toLowerCase() || text.includes(answer.toLowerCase())) { await label.click(); return true; }
  }
  return false;
}

export async function fillFormStep(page: Page, answers: ProfileAnswerRecord[]): Promise<FillResult> {
  const unfilledFields: Array<{ label: string; type: string }> = [];
  const formGroups = await page.$$(".jobs-easy-apply-form-section__grouping, .fb-dash-form-element");

  for (const group of formGroups) {
    const labelEl = await group.$("label, .fb-dash-form-element__label, legend");
    const labelText = labelEl ? ((await labelEl.textContent()) ?? "").trim() : "";
    if (!labelText) continue;

    const textInput = await group.$('input[type="text"], input[type="tel"], input[type="email"], input[type="url"]');
    const textarea = await group.$("textarea");
    const select = await group.$("select");
    const typeahead = await group.$(".basic-typeahead, [data-test-text-entity-list-filter-typeahead]");
    const radioGroup = await group.$('fieldset, [role="radiogroup"]');
    const fileInput = await group.$('input[type="file"]');
    const checkbox = await group.$('input[type="checkbox"]');

    if (textInput) {
      const currentValue = await textInput.inputValue();
      if (currentValue) continue;
      const answer = matchField(labelText, "text", answers);
      if (answer) { await fillTextField(page, textInput, answer); }
      else { const r = await textInput.getAttribute("aria-required"); const rr = await textInput.getAttribute("required"); if (r === "true" || rr !== null) unfilledFields.push({ label: labelText, type: "text" }); }
    } else if (textarea) {
      const currentValue = await textarea.inputValue();
      if (currentValue) continue;
      const answer = matchField(labelText, "textarea", answers);
      if (answer) { await fillTextField(page, textarea, answer); }
      else { const r = await textarea.getAttribute("aria-required"); const rr = await textarea.getAttribute("required"); if (r === "true" || rr !== null) unfilledFields.push({ label: labelText, type: "textarea" }); }
    } else if (select) {
      const answer = matchField(labelText, "select", answers);
      if (answer) { if (!(await fillSelectField(page, select, answer))) unfilledFields.push({ label: labelText, type: "select" }); }
      else { const r = await select.getAttribute("aria-required"); const rr = await select.getAttribute("required"); if (r === "true" || rr !== null) unfilledFields.push({ label: labelText, type: "select" }); }
    } else if (typeahead) {
      const answer = matchField(labelText, "select", answers);
      if (answer) { await fillLinkedInDropdown(page, typeahead, answer); }
      else { unfilledFields.push({ label: labelText, type: "typeahead" }); }
    } else if (radioGroup) {
      const answer = matchField(labelText, "radio", answers);
      if (answer) { if (!(await fillRadioField(page, radioGroup, answer))) unfilledFields.push({ label: labelText, type: "radio" }); }
      else { unfilledFields.push({ label: labelText, type: "radio" }); }
    } else if (fileInput) {
      const uploaded = await group.$(".jobs-document-upload__upload-label--complete");
      if (!uploaded) {
        const answer = matchField(labelText, "file", answers);
        if (answer) { await fileInput.setInputFiles(answer); }
        else { unfilledFields.push({ label: labelText, type: "file" }); }
      }
    } else if (checkbox) {
      const answer = matchField(labelText, "checkbox", answers);
      if (answer && answer.toLowerCase() === "yes") { if (!(await checkbox.isChecked())) await checkbox.check(); }
    }
  }

  return { success: unfilledFields.length === 0, unfilledFields };
}
