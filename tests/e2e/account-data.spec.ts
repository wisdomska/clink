import { unzipSync, strFromU8 } from "fflate";
import { test, expect } from "./fixtures";
import { admin } from "./helpers";

test.describe("Account data (SET-03, ACC-08, TOG-03)", () => {
  test("SET-03: export is a zip of my own data, never After Dark", async ({ couple }) => {
    const { a } = couple;
    const body = `export me ${Date.now()}`;
    await a.request.post("/api/messages", {
      data: { clientId: crypto.randomUUID(), type: "text", body },
    });
    const r = await a.request.post("/api/me/export");
    expect(r.ok()).toBeTruthy();
    const { url, expires_at } = await r.json();
    const hours = (new Date(expires_at).getTime() - Date.now()) / 3600000;
    expect(hours).toBeGreaterThan(47);
    expect(hours).toBeLessThanOrEqual(48);
    const zip = unzipSync(new Uint8Array(await (await a.request.get(url)).body()));
    const all = Object.values(zip).map(strFromU8).join("\n");
    expect(all).toContain(body);
    expect(all).toContain("After Dark and vault items are never included");
  });

  test("ACC-08: deleting an account removes the user and what they shared", async ({ couple }) => {
    const { b, theo } = couple;
    const body = `goodbye ${Date.now()}`;
    await b.request.post("/api/messages", {
      data: { clientId: crypto.randomUUID(), type: "text", body },
    });
    expect((await b.request.post("/api/me/delete", { data: { confirm: "DELETE" } })).ok()).toBe(
      true,
    );
    // The grace period is 30 days; run the job as if it has passed.
    await admin
      .from("deletion_requests")
      .update({ execute_after: new Date(Date.now() - 1000).toISOString() })
      .eq("user_id", theo.id);
    const job = await b.request.post("/api/jobs/daily", {
      headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
    });
    expect(job.ok()).toBeTruthy();
    const { data: user } = await admin.auth.admin.getUserById(theo.id);
    expect(user.user).toBeNull();
    const { data: left } = await admin.from("messages").select("id").eq("body", body);
    expect(left).toEqual([]);
    const { data: profile } = await admin.from("profiles").select("id").eq("id", theo.id);
    expect(profile).toEqual([]);
  });

  test("TOG-03: call shortcuts use the partner's saved number", async ({ couple }) => {
    const { a, theo } = couple;
    await admin.from("profiles").update({ phone: "+233 20 123 4567" }).eq("id", theo.id);
    await a.goto("/chat");
    await a.getByRole("button", { name: "Call", exact: true }).click();
    await expect(a.getByRole("link", { name: /WhatsApp/ })).toHaveAttribute(
      "href",
      "https://wa.me/233201234567",
    );
    await expect(a.getByRole("link", { name: /FaceTime/ })).toHaveAttribute(
      "href",
      "facetime:+233201234567",
    );
    await expect(a.getByRole("link", { name: /Phone/ })).toHaveAttribute(
      "href",
      "tel:+233201234567",
    );
  });
});
