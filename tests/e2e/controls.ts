import { expect, type Locator, type Page } from "@playwright/test";

/** Choose from a branded <Select>: open it by its label, then pick the option by name. */
export async function pickOption(scope: Page | Locator, label: string | RegExp, option: string) {
  const page = "page" in scope ? scope.page() : scope;
  await scope.getByLabel(label).click();
  await page.getByRole("option", { name: option, exact: true }).click();
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** Pick a "YYYY-MM-DD" date in a branded DateField. */
export async function pickDate(scope: Page | Locator, label: string | RegExp, iso: string) {
  const page = "page" in scope ? scope.page() : scope;
  await scope.getByLabel(label).click();
  const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
  const grid = page.getByRole("grid");
  await expect(grid).toBeVisible();
  for (let i = 0; i < 36; i++) {
    const [name, year] = ((await grid.getAttribute("aria-label")) ?? "").split(" ");
    const diff = (y - Number(year)) * 12 + (m - 1 - MONTHS.indexOf(name!));
    if (diff === 0) break;
    await page.getByRole("button", { name: diff > 0 ? "Next month" : "Previous month" }).click();
  }
  const label2 = new Date(y, m - 1, d).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  await grid.getByRole("button", { name: label2, exact: true }).click();
}

/** Pick an "HH:MM" time in a branded TimeField. */
export async function pickTime(scope: Page | Locator, label: string | RegExp, hhmm: string) {
  const page = "page" in scope ? scope.page() : scope;
  const [h, m] = hhmm.split(":") as [string, string];
  await scope.getByLabel(label).click();
  await page
    .getByRole("listbox", { name: "Hour" })
    .getByRole("option", { name: h, exact: true })
    .click();
  await page
    .getByRole("listbox", { name: "Minute" })
    .getByRole("option", { name: m, exact: true })
    .click();
}
