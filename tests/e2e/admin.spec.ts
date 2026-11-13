import { createHmac } from "node:crypto";
import { test, expect } from "./fixtures";
import { admin, makeUser, signIn } from "./helpers";

/** RFC 6238 TOTP (SHA-1, 30 s, 6 digits) from a base32 secret. */
function totp(secret: string, at = Date.now()): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const c of secret.replace(/=+$/, "").toUpperCase())
    bits += alphabet.indexOf(c).toString(2).padStart(5, "0");
  const key = Buffer.from(bits.match(/.{8}/g)!.map((b) => parseInt(b, 2)));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(at / 1000 / 30)));
  const h = createHmac("sha1", key).update(counter).digest();
  const o = h[h.length - 1]! & 0xf;
  return String((h.readUInt32BE(o) & 0x7fffffff) % 1_000_000).padStart(6, "0");
}

test.describe("Admin (/admin)", () => {
  test("non-admins get a 404; admins must enrol TOTP; actions are audited; no private content is ever exposed", async ({
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

    expect((await a.request.get("/api/admin/metrics")).status()).toBe(404);
    const notAdmin = await a.goto("/admin");
    expect(notAdmin?.status()).toBe(404);

    const boss = await makeUser("Ops", { onboarded: true });
    await admin.from("profiles").update({ is_admin: true }).eq("id", boss.id);
    const ctx = await browser.newContext();
    const p = await ctx.newPage();
    await signIn(p, boss, "/admin");
    await p.goto("/admin");
    await expect(p).toHaveURL(/\/admin\/mfa/);
    expect((await p.request.get("/api/admin/metrics")).status()).toBe(401); // aal1 refused

    await expect(p.getByAltText("QR code for your authenticator app")).toBeVisible({
      timeout: 10000,
    });
    const secret = (await p.getByText(/Or enter this key:/).innerText())
      .replace("Or enter this key: ", "")
      .trim();
    await p.getByLabel("6-digit code").fill(totp(secret));
    await p.getByRole("button", { name: "Verify" }).click();
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
    expect([404, 409]).toContain(r.status());
    await b.goto("/us");
    await ctx.close();
  });
});
