import { test, expect } from "./fixtures";

test("top bar and tab bar stay on screen while the page scrolls", async ({ couple }) => {
  const { a } = couple;
  // A short window, so every device size has something to scroll.
  await a.setViewportSize({ width: a.viewportSize()!.width, height: 560 });
  const vh = 560;
  await a.goto("/settings?tab=look");
  const tabs = a.getByRole("tablist", { name: "Settings sections" });
  await expect(tabs).toBeVisible();
  // Over the content, not the sidebar (which scrolls on its own on short windows).
  await a.mouse.move(a.viewportSize()!.width * 0.6, 300);
  await a.mouse.wheel(0, 2000);
  await expect.poll(() => a.evaluate(() => window.scrollY)).toBeGreaterThan(100);
  const box = await tabs.boundingBox();
  expect(box!.y).toBeGreaterThanOrEqual(0);
  // Phones and tablets: a row of tabs pinned at the top. Desktop: a pinned side menu.
  if (a.viewportSize()!.width >= 1024) expect(box!.y).toBeLessThan(vh / 2);
  else expect(box!.y + box!.height).toBeLessThan(vh / 2);

  await a.goto("/us");
  // Over the content, not the sidebar (which scrolls on its own on short windows).
  await a.mouse.move(a.viewportSize()!.width * 0.6, 300);
  await a.mouse.wheel(0, 2000);
  const settings = a.locator(".app-topbar").getByRole("link", { name: "Keep", exact: true });
  const nav = a.getByRole("navigation", { name: "Main" });
  // Phones and tablets have the top bar; desktop uses the side rail instead.
  if (await settings.isVisible()) {
    expect((await settings.boundingBox())!.y).toBeGreaterThanOrEqual(0);
  }
  if (await nav.isVisible()) {
    const n = (await nav.boundingBox())!;
    expect(Math.round(n.y + n.height)).toBe(vh);
  }
});
