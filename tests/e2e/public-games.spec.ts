import { test, expect } from "@playwright/test";
import { PUBLIC_GAMES } from "../../src/lib/public-games";

// The public games pages: readable without an account, one h1, a canonical
// address, structured data that parses, and a share image that loads.
test("the games hub links every game page", async ({ page }) => {
  await page.goto("/games");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Games for couples");
  for (const g of PUBLIC_GAMES)
    await expect(page.locator(`main a[href="/games/${g.slug}"]`).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Games" }).first()).toBeVisible();
});

test("every game page explains the game and describes itself to search engines", async ({
  page,
  request,
}) => {
  test.setTimeout(120_000);
  for (const g of PUBLIC_GAMES) {
    const res = await page.goto(`/games/${g.slug}`);
    expect(res?.status(), g.slug).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(
      page.getByRole("heading", { name: `How to play ${g.name}`, exact: true }),
    ).toBeVisible();
    expect(await page.locator('link[rel="canonical"]').getAttribute("href")).toMatch(
      new RegExp(`/games/${g.slug}$`),
    );
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const types = blocks.map((b) => JSON.parse(b)["@type"]);
    expect(types).toEqual(expect.arrayContaining(["Article", "FAQPage", "BreadcrumbList"]));
    const text = await page.locator("main").innerText();
    expect(text, `${g.slug} has no em dashes`).not.toMatch(/—/);
  }
  // The share image, at whatever versioned address the page points to.
  await page.goto("/games/oware");
  const src = await page.locator('meta[property="og:image"]').getAttribute("content");
  const og = await request.get(new URL(src!).pathname + new URL(src!).search);
  expect(og.status()).toBe(200);
  expect(og.headers()["content-type"]).toContain("image/png");
});

test("an unknown game is a real 404", async ({ request }) => {
  expect((await request.get("/games/not-a-game")).status()).toBe(404);
});
