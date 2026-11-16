import { test, expect } from "./fixtures";
import { adminSignIn } from "./helpers";

test("admin content library: arrows reorder and the order survives a reload", async ({
  browser,
}) => {
  const ctx = await browser.newContext();
  const p = await ctx.newPage();
  await adminSignIn(p);
  await p.goto("/admin/content");

  const rows = p.getByRole("listitem");
  await expect(rows.first()).toBeVisible({ timeout: 15000 });
  const first = (await rows.nth(0).getByRole("button").nth(1).innerText()).trim();
  const second = (await rows.nth(1).getByRole("button").nth(1).innerText()).trim();

  // Up is disabled on the first row.
  await expect(rows.nth(0).getByRole("button", { name: "Move up" })).toBeDisabled();

  await rows.nth(0).getByRole("button", { name: "Move down" }).click();
  // Moves straight away.
  await expect(rows.nth(0)).toContainText(second);
  await expect(rows.nth(1)).toContainText(first);

  // And sticks after a reload.
  await p.waitForLoadState("networkidle");
  await p.reload();
  await expect(rows.nth(0)).toContainText(second, { timeout: 15000 });
  await expect(rows.nth(1)).toContainText(first);

  // Put it back.
  await rows.nth(1).getByRole("button", { name: "Move up" }).click();
  await expect(rows.nth(0)).toContainText(first);
  await ctx.close();
});
