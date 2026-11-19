import { test, expect } from "./fixtures";
import { admin, adminSignIn } from "./helpers";

test("app errors land in admin's Errors page; After Dark errors never do", async ({
  couple,
  browser,
}) => {
  const { a } = couple;
  const tag = `boom-${Date.now()}`;
  await a.goto("/us");
  await a.evaluate(
    (t) =>
      setTimeout(() => {
        throw new Error(`test error ${t}`);
      }),
    tag,
  );
  await expect
    .poll(
      async () =>
        (
          await admin
            .from("error_log")
            .select("count, path, source")
            .eq("message", `test error ${tag}`)
        ).data,
    )
    .toEqual([{ count: 1, path: "/us", source: "client" }]);

  // The same error from After Dark is dropped before anything is stored.
  await a.request.post("/api/errors", { data: { message: `dark ${tag}`, path: "/dark/home" } });
  await a.waitForTimeout(800);
  expect(
    (await admin.from("error_log").select("id").eq("message", `dark ${tag}`)).data,
  ).toHaveLength(0);

  // Only admins can read it.
  expect((await a.request.get("/api/admin/errors")).ok()).toBe(false);
  const ctx = await browser.newContext();
  const p = await ctx.newPage();
  await adminSignIn(p);
  await p.goto("/admin/errors");
  await expect(p.getByRole("heading", { name: "Errors", exact: true })).toBeVisible({
    timeout: 15000,
  });
  await expect(p.getByText(`test error ${tag}`, { exact: true })).toBeVisible();
  await ctx.close();
});
