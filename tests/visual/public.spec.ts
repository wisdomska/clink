import { test, expect } from "@playwright/test";

// Visual regression for pages that need no account. Baselines live next to this
// file; update them with `pnpm test:e2e tests/visual --update-snapshots` after an
// intended design change.
const ROUTES = ["/", "/login", "/signup", "/privacy", "/help"];

for (const route of ROUTES) {
  test(`looks the same: ${route}`, async ({ page }) => {
    // Clocks and countdowns are live, so pin the time.
    await page.clock.setFixedTime(new Date("2026-11-13T21:14:00Z"));
    await page.goto(route, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    await expect(page).toHaveScreenshot({
      fullPage: true,
      animations: "disabled",
      maxDiffPixelRatio: 0.01,
    });
  });
}
