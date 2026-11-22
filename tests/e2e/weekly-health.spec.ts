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
  // ...split into where the time went.
  const split = await admin.from("page_timings").select("split_views").eq("path", "/us");
  expect(split.data?.reduce((n, r) => n + r.split_views, 0)).toBeGreaterThan(0);

  // Private screens are never recorded, whatever is sent.
  const dark = await a.request.post("/api/vitals", { data: { path: "/dark/deck", lcp: 900 } });
  expect(await dark.json()).toEqual({ logged: false });
  const adm = await a.request.post("/api/vitals", { data: { path: "/admin/users", lcp: 900 } });
  expect(await adm.json()).toEqual({ logged: false });

  // A slow screen and a dropped call show up on the dashboard (3 loads at 99 s, then one at 4.2 s below: 75.3 s).
  const slow = `/e2e-slow-${randomUUID().slice(0, 6)}`;
  await admin
    .from("page_timings")
    .insert({ path: slow, views: 3, lcp_sum_ms: 3 * 99_000, slow: 3 });
  // A slow load keeps its plain facts (no one's identity).
  const slowLoad = await a.request.post("/api/vitals", {
    data: {
      path: slow,
      lcp: 4200,
      detail: {
        server: 900,
        wait: 300,
        fetch: 2000,
        render: 1000,
        element: "img",
        net: "3g",
        installed: true,
        warm: false,
      },
    },
  });
  expect(await slowLoad.json()).toEqual({ logged: true });
  // A bad detail is refused rather than stored.
  const bad = await a.request.post("/api/vitals", {
    data: {
      path: slow,
      lcp: 4200,
      detail: {
        server: 1,
        wait: 1,
        fetch: 1,
        render: 1,
        element: "<b>",
        installed: true,
        warm: false,
      },
    },
  });
  expect(bad.status()).toBe(422);
  await expect
    .poll(
      async () =>
        (await admin.from("page_slow_loads").select("id").eq("path", slow)).data?.length ?? 0,
      { timeout: 15000 },
    )
    .toBe(1);
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
  await expect(
    speed.getByRole("listitem").filter({ hasText: slow }).getByText("75.3 s"),
  ).toBeVisible();
  await expect(speed.getByRole("img", { name: new RegExp(`${slow}: Server`) })).toBeVisible();
  const facts = card.getByRole("definition").filter({ hasText: /img \d+/ });
  await expect(facts.first()).toBeVisible();
  const health = await (await page.request.get("/api/admin/health")).json();
  expect(health.calls.dropped).toBeGreaterThanOrEqual(1);
  await page.close();
  await admin.from("page_timings").delete().eq("path", slow);
  await admin.from("page_slow_loads").delete().eq("path", slow);
});
