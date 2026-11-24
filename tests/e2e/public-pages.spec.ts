import { test, expect } from "@playwright/test";
import { GUIDES } from "../../src/lib/guides";

// Guides, long distance, FAQ and About: readable without an account, one h1,
// canonical address, structured data that parses, no em dashes, and linked
// from the footer.
const PAGES = [
  "/guides",
  ...GUIDES.map((g) => `/guides/${g.slug}`),
  "/long-distance",
  "/faq",
  "/about",
];

test("public content pages describe themselves to search engines", async ({ page, request }) => {
  test.setTimeout(120_000);
  for (const path of PAGES) {
    const res = await page.goto(path);
    expect(res?.status(), path).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    expect(await page.locator('link[rel="canonical"]').getAttribute("href")).toMatch(
      new RegExp(`${path}$`),
    );
    for (const b of await page.locator('script[type="application/ld+json"]').allTextContents())
      expect(() => JSON.parse(b), path).not.toThrow();
    expect(await page.locator("main").innerText(), `${path} has no em dashes`).not.toMatch(/—/);
    const og = await page.locator('meta[property="og:image"]').getAttribute("content");
    const img = await request.get(new URL(og!).pathname + new URL(og!).search);
    expect(img.status(), `${path} share image`).toBe(200);
  }
});

test("the footer links every public section", async ({ page }) => {
  await page.goto("/");
  const footer = page.getByRole("navigation", { name: "Explore" });
  for (const name of ["Games", "Guides", "Long distance", "FAQ", "About"])
    await expect(footer.getByRole("link", { name, exact: true })).toBeVisible();
});

test("a guide has a table of contents that jumps to each section", async ({ page }) => {
  await page.goto(`/guides/${GUIDES[0]!.slug}`);
  const toc = page.getByRole("navigation", { name: "In this guide" });
  const first = GUIDES[0]!.sections[0]!;
  await toc.getByRole("link", { name: first.title }).click();
  await expect(page).toHaveURL(new RegExp(`#${first.id}$`));
});
