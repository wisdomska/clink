import { randomUUID } from "node:crypto";
import { test, expect } from "./fixtures";
import { admin, adminSignIn } from "./helpers";

test("first loads are timed (never After Dark) and the admin sees the week's health", async ({
  couple,
}) => {
  test.setTimeout(120_000);
  const { a } = couple;
  const views = async (path: string) =>
    (await admin.from("page_timings").select("views").eq("path", path)).data?.reduce(
      (n, r) => n + r.views,
      0,
    ) ?? 0;

  // A visit to Us records how long it took to show, once the screen is left.
  const before = await views("/us");
  await a.goto("/us");
  await expect(a.getByRole("heading", { level: 1 }).first()).toBeVisible({ timeout: 15000 });
  await a.waitForTimeout(500);
  await a.goto("/chat");
  await expect.poll(() => views("/us"), { timeout: 15000 }).toBeGreaterThan(before);

  // Private screens are never recorded, whatever is sent.
  const dark = await a.request.post("/api/vitals", { data: { path: "/dark/deck", lcp: 900 } });
  expect(await dark.json()).toEqual({ logged: false });
  const adm = await a.request.post("/api/vitals", { data: { path: "/admin/users", lcp: 900 } });
  expect(await adm.json()).toEqual({ logged: false });

  // A slow screen and a dropped call show up on the dashboard.
  const slow = `/e2e-slow-${randomUUID().slice(0, 6)}`;
  await admin
    .from("page_timings")
    .insert({ path: slow, views: 3, lcp_sum_ms: 3 * 99_000, slow: 3 });
  await a.request.post("/api/calls/log", {
    data: { outcome: "failed", video: false, seconds: 12 },
  });

  const page = await a.context().browser()!.newPage();
  await adminSignIn(page);
  await page.goto("/admin");
  const card = page.getByRole("region", { name: "This week's health" });
  await expect(card).toBeVisible({ timeout: 20000 });
  await expect(card.getByRole("article", { name: "Errors" })).toBeVisible();
  const calls = card.getByRole("article", { name: "Calls" });
  await expect(calls.getByText(/^Dropped$/)).toBeVisible();
  const speed = card.getByRole("list", { name: "Slowest screens" });
  await expect(speed.getByText(slow)).toBeVisible();
  await expect(speed.getByText("99.0 s")).toBeVisible();
  const health = await (await page.request.get("/api/admin/health")).json();
  expect(health.calls.dropped).toBeGreaterThanOrEqual(1);
  await page.close();
  await admin.from("page_timings").delete().eq("path", slow);
});
