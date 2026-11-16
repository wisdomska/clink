import { test, expect } from "./fixtures";

test("top bar and tab bar stay on screen while the page scrolls", async ({ couple }) => {
  const { a } = couple;
  const vh = a.viewportSize()!.height;
  await a.goto("/settings?tab=look");
  const tabs = a.getByRole("tablist", { name: "Settings sections" });
  await expect(tabs).toBeVisible();
  await a.mouse.wheel(0, 2000);
  await expect.poll(() => a.evaluate(() => window.scrollY)).toBeGreaterThan(100);
  const box = await tabs.boundingBox();
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.y + box!.height).toBeLessThan(vh / 2);

  await a.goto("/us");
  await a.mouse.wheel(0, 2000);
  const settings = a.getByRole("link", { name: "Settings" });
  const nav = a.getByRole("navigation", { name: "Main" });
  const sBox = await settings.boundingBox();
  if (sBox) expect(sBox.y).toBeGreaterThanOrEqual(0);
  if (await nav.isVisible()) {
    const n = (await nav.boundingBox())!;
    expect(Math.round(n.y + n.height)).toBe(vh);
  }
});
