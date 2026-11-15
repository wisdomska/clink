import { test, expect } from "./fixtures";
import { admin, adminSignIn } from "./helpers";

test.describe("Admin (/admin)", () => {
  test("non-admins get a 404; admins go straight in; actions are audited; no private content is ever exposed", async ({
    couple,
    browser,
  }) => {
    const { a, b, nia } = couple;
    // Private content that must never reach an admin.
    await a.goto("/chat");
    await a.request.post("/api/messages", {
      data: { clientId: crypto.randomUUID(), type: "text", body: "PRIVATE-MSG-7731" },
    });
    await a.request.post("/api/letters", {
      data: { condition: "Open when PRIVATE", body: "PRIVATE-LETTER-7731" },
    });

    // A Clink account (even an is_admin one) gets nothing: the portal has its own sign-in.
    await admin.from("profiles").update({ is_admin: true }).eq("id", nia.id);
    expect((await a.request.get("/api/admin/metrics")).status()).toBe(401);
    await a.goto("/admin");
    await expect(a).toHaveURL(/\/admin\/login/);
    await admin.from("profiles").update({ is_admin: false }).eq("id", nia.id);

    const ctx = await browser.newContext();
    const p = await ctx.newPage();
    await adminSignIn(p);
    await p.goto("/admin");
    await expect(p.getByRole("heading", { name: "Dashboard" })).toBeVisible({ timeout: 10000 });
    await expect(p.getByText("Free-tier usage")).toBeVisible();

    // Suspend Nia: she is refused immediately; the action is audited.
    const users = await (
      await p.request.get(`/api/admin/users?q=${encodeURIComponent(nia.email)}`)
    ).json();
    expect(users.users[0].email).toBe(nia.email);
    expect(
      (
        await p.request.post(`/api/admin/users/${nia.id}`, {
          data: { action: "suspend", reason: "test" },
        })
      ).ok(),
    ).toBeTruthy();
    expect((await a.request.get("/api/me/state")).status()).toBe(403);
    const audit = await (await p.request.get("/api/admin/audit?event=admin.suspend")).json();
    expect(audit.events.some((e: { user_id: string }) => e.user_id === nia.id)).toBe(true);
    await p.request.post(`/api/admin/users/${nia.id}`, { data: { action: "unsuspend" } });

    // Content library edit is audited too.
    const kits = await (await p.request.get("/api/admin/content/date_kits")).json();
    const kit = kits.rows[0];
    expect(
      (
        await p.request.patch(`/api/admin/content/date_kits/${kit.id}`, {
          data: { enabled: false },
        })
      ).ok(),
    ).toBeTruthy();
    await p.request.patch(`/api/admin/content/date_kits/${kit.id}`, { data: { enabled: true } });

    // Sweep every admin read endpoint: nothing private, ever.
    const pages = [
      "/api/admin/metrics",
      "/api/admin/users",
      "/api/admin/reports?status=all",
      "/api/admin/audit",
      "/api/admin/settings",
      "/api/admin/content/dares",
      "/api/admin/content/deck_cards",
    ];
    for (const url of pages) {
      const body = await (await p.request.get(url)).text();
      expect(body, url).not.toContain("PRIVATE-MSG-7731");
      expect(body, url).not.toContain("PRIVATE-LETTER-7731");
    }
    expect((await p.request.get("/api/admin/content/messages")).status()).toBe(404);
    expect((await p.request.get("/api/admin/content/letters")).status()).toBe(404);
    // An admin is still just a user to RLS: no reading someone else's couple.
    const r = await p.request.get(`/api/capsules/00000000-0000-4000-8000-000000000000`);
    expect([401, 404, 409]).toContain(r.status());
    await b.goto("/us");
    await ctx.close();
  });
});
