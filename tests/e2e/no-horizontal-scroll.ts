import { expect, type Page } from "@playwright/test";

/** Fails if the page is wider than the viewport (spec: no horizontal scroll at any width). */
export async function expectNoHorizontalScroll(page: Page) {
  const { scroll, client } = await page.evaluate(() => ({
    scroll: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
    client: document.documentElement.clientWidth,
  }));
  expect(scroll, `page is ${scroll}px wide in a ${client}px viewport`).toBeLessThanOrEqual(client + 1);
}
