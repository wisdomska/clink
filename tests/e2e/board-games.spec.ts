import { test, expect } from "./fixtures";
import { makeUser, signIn, waitLive } from "./helpers";
import type { Page } from "@playwright/test";

const column = (p: Page, n: number) =>
  p.getByRole("button", { name: new RegExp(`^Column ${n}(,|$)`) });

test("Four Up: a slow game between you two, to a win", async ({ couple }) => {
  test.setTimeout(120_000);
  const { a, b } = couple;
  await a.goto("/play");
  await a.getByRole("button", { name: "Start Four Up with Theo" }).click();
  await a.waitForURL(/\/play\/fourup\/[0-9a-f-]{36}$/);
  const url = a.url();
  await expect(a.getByText("Your move", { exact: true })).toBeVisible();
  await b.goto(url.replace(/^https?:\/\/[^/]+/, ""));
  await expect(b.getByText("Nia's move")).toBeVisible();
  await waitLive(b);

  // Nia builds a row along the bottom; Theo stacks in the corner.
  for (const [who, col] of [
    [a, 1],
    [b, 7],
    [a, 2],
    [b, 7],
    [a, 3],
    [b, 7],
  ] as const) {
    await expect(who.getByText("Your move", { exact: true })).toBeVisible({ timeout: 15000 });
    await column(who, col).click();
  }
  await expect(a.getByText("Your move", { exact: true })).toBeVisible({ timeout: 15000 });
  await column(a, 4).click();
  await expect(a.getByText("You win!")).toBeVisible({ timeout: 15000 });
  await expect(b.getByText("Nia wins!")).toBeVisible({ timeout: 15000 });
  // The lobby keeps it in the history, not as a game still going.
  await a.goto("/play");
  await expect(a.getByRole("button", { name: "Start Four Up with Theo" })).toBeVisible();
  await expect(a.locator('a[href^="/play/fourup/"]:not([href$="/practice"])')).toHaveCount(0);
});

test("Oware: sow, see it on the other side, and agree a draw", async ({ couple }) => {
  test.setTimeout(90_000);
  const { a, b } = couple;
  await a.goto("/play");
  await a.getByRole("button", { name: "Start Oware with Theo" }).click();
  await a.waitForURL(/\/play\/oware\//);
  const path = new URL(a.url()).pathname;
  await a.getByRole("button", { name: /^Your pit 3, 4 seeds, tap to sow/ }).click();
  await expect(a.getByText("Theo's move")).toBeVisible({ timeout: 10000 });
  await b.goto(path);
  // Seen from Theo's side, Nia's sown pits now hold 5.
  await expect(b.getByRole("button", { name: /^Their pit 4, 5 seeds/ })).toBeVisible();
  await expect(b.getByText("Your move", { exact: true })).toBeVisible();
  // Their pits can't be played; his own can.
  await expect(b.getByRole("button", { name: /^Their pit 1/ })).toBeDisabled();
  await b.getByRole("button", { name: "Offer a draw" }).click();
  await expect(a.getByText("Theo offers a draw.")).toBeVisible({ timeout: 15000 });
  await a.getByRole("button", { name: "Accept" }).click();
  await expect(a.getByText("It's a draw.")).toBeVisible({ timeout: 10000 });
  await expect(b.getByText("It's a draw.")).toBeVisible({ timeout: 15000 });
});

test("Draughts: pick a piece, then a square; the move reaches your partner", async ({ couple }) => {
  test.setTimeout(90_000);
  const { a, b } = couple;
  await a.goto("/play");
  await a.getByRole("button", { name: "Start Draughts with Theo" }).click();
  await a.waitForURL(/\/play\/draughts\//);
  const path = new URL(a.url()).pathname;
  await expect(a.getByRole("grid", { name: "Draughts board, 10 by 10" })).toBeVisible();
  await a.getByRole("button", { name: "Your piece, can move" }).first().click();
  await a
    .getByRole("button", { name: /move here/ })
    .first()
    .click();
  await expect(a.getByText("Theo's move")).toBeVisible({ timeout: 10000 });
  await b.goto(path);
  await expect(b.getByText("Your move", { exact: true })).toBeVisible();
  // Theo sees his own pieces at the bottom and can move one.
  await expect(b.getByRole("button", { name: "Your piece, can move" }).first()).toBeVisible();
});

test("practice against Clink, even before linking", async ({ page }) => {
  test.setTimeout(90_000);
  const esi = await makeUser("Esi");
  await signIn(page, esi, "/play/fourup/practice");
  await expect(page.getByRole("heading", { name: "Four Up: practice" })).toBeVisible();
  await page.getByRole("button", { name: "Easy" }).click();
  await column(page, 4).click();
  // Clink answers, and it's your move again.
  await expect(page.getByText("Your move", { exact: true })).toBeVisible({ timeout: 10000 });
  const discs = await page
    .getByRole("group", { name: "Four Up board" })
    .locator("span[style*='radial-gradient']")
    .count();
  expect(discs).toBe(2);
  await page.goto("/play/draughts/practice");
  await expect(page.getByRole("grid", { name: "Draughts board, 10 by 10" })).toBeVisible();
  await page.getByRole("button", { name: "8 by 8" }).click();
  await expect(page.getByRole("grid", { name: "Draughts board, 8 by 8" })).toBeVisible();
});
