import { test, expect } from "./fixtures";
import { admin } from "./helpers";

// Announcements stay pinned at the top while the page scrolls, with the
// screen's own top bar right under them.
test("banners are pinned and stand out", async ({ couple }) => {
  const { a } = couple;
  const body = `Clink 2.0 is here ${Date.now()}`;
  const { data, error } = await admin
    .from("announcements")
    .insert({ kind: "announcement", body, active: true })
    .select("id")
    .single();
  expect(error).toBeNull();
  try {
    await a.setViewportSize({ width: a.viewportSize()!.width, height: 560 });
    await a.goto("/us");
    const banner = a.getByRole("status").filter({ hasText: body });
    await expect(banner).toBeVisible();
    // Over the content, not the sidebar (which scrolls on its own on short windows).
    await a.mouse.move(a.viewportSize()!.width * 0.6, 300);
    await a.mouse.wheel(0, 1500);
    await expect.poll(() => a.evaluate(() => window.scrollY)).toBeGreaterThan(100);
    const b = (await banner.boundingBox())!;
    expect(b.y).toBeLessThan(40);
    const keep = a.locator(".app-topbar").getByRole("link", { name: "Keep", exact: true });
    if (await keep.isVisible()) {
      expect((await keep.boundingBox())!.y).toBeGreaterThanOrEqual(b.y + b.height - 1);
    }
    await a.screenshot({
      path: "/tmp/claude-0/-home-user-clink/3960b7a0-e4ea-5986-a48f-133aaeb2c903/scratchpad/banner.png",
    });
  } finally {
    await admin.from("announcements").delete().eq("id", data!.id);
  }
});
