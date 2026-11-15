import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";
import { test, expect } from "./fixtures";
import { admin, type TestUser } from "./helpers";
import type { Page } from "@playwright/test";

async function setUp(p: Page, tiers: string[], pin = "2611") {
  const r = await p.request.post("/api/dark/setup", { data: { pin, tiers } });
  expect(r.ok()).toBeTruthy();
}
async function verify(p: Page) {
  const { declaration } = await (await p.request.get("/api/dark/verify-age")).json();
  expect(
    (await p.request.post("/api/dark/verify-age", { data: { declaration } })).ok(),
  ).toBeTruthy();
}
async function sendSensitive(p: Page, retention: "once" | "24h" | "7d" | "vault") {
  const img = await sharp({
    create: { width: 600, height: 800, channels: 3, background: "#FF5A3C" },
  })
    .withExif({ IFD0: { Make: "Leaky" } })
    .jpeg()
    .toBuffer();
  const up = await p.request.post("/api/media/upload-url", {
    data: { kind: "image", mime: "image/jpeg", size: img.length, sensitive: true, retention },
  });
  expect(up.ok(), await up.text()).toBeTruthy();
  const { id, upload } = await up.json();
  const put = await p.request.fetch(upload.url, {
    method: "PUT",
    headers: upload.headers,
    data: img,
  });
  expect(put.ok()).toBeTruthy();
  expect((await p.request.post(`/api/media/${id}/complete`)).ok()).toBeTruthy();
  expect((await p.request.post("/api/dark/send", { data: { mediaId: id } })).ok()).toBeTruthy();
  return id as string;
}
async function asUser(u: TestUser) {
  const { data } = await admin.auth.admin.generateLink({ type: "magiclink", email: u.email });
  const c = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );
  await c.auth.verifyOtp({ token_hash: data.properties!.hashed_token, type: "magiclink" });
  return c;
}

test.describe("After Dark (spec section 7 and the must-pass safety tests)", () => {
  test("flow 10.3: entry visible, setup first, PIN lock with lockout, lower choice wins, Unhinged needs both verified", async ({
    couple,
  }) => {
    const { a, b } = couple;
    // The entry is always there; opening it before setup goes to setup.
    await a.goto("/us");
    await a.getByRole("link", { name: "After Dark" }).first().click();
    await expect(a).toHaveURL(/\/dark\/setup/);
    await setUp(a, ["Flirty", "Steamy", "Spicy"]);
    expect((await (await a.request.get("/api/dark/state")).json()).rank).toBe(0);
    await setUp(b, ["Flirty", "Steamy"]);
    expect((await (await a.request.get("/api/dark/state")).json()).rank).toBe(2);
    await a.goto("/us");
    await expect(a.getByRole("link", { name: "After Dark" }).first()).toBeVisible();

    // Lock screen: wrong PIN, then the right one.
    await a.request.post("/api/dark/lock");
    await a.goto("/dark/home");
    await expect(a).toHaveURL(/\/dark\?next=/);
    for (const k of "1111") await a.getByRole("button", { name: k, exact: true }).click();
    await expect(a.getByText("That's not it. 4 tries left.")).toBeVisible();
    for (const k of "2611") await a.getByRole("button", { name: k, exact: true }).click();
    await expect(a).toHaveURL(/\/dark\/home/);
    await expect(a.getByRole("button", { name: /Spicy\s*Waiting on them/ })).toBeVisible();

    // Five wrong tries lock B out for 15 minutes.
    await b.request.post("/api/dark/lock");
    for (let i = 0; i < 5; i++) await b.request.post("/api/dark/unlock", { data: { pin: "0000" } });
    const locked = await b.request.post("/api/dark/unlock", { data: { pin: "2611" } });
    expect(locked.status()).toBe(423);
    await admin
      .from("dark_settings")
      .update({ pin_locked_until: null })
      .eq("user_id", couple.theo.id);
    expect((await b.request.post("/api/dark/unlock", { data: { pin: "2611" } })).ok()).toBeTruthy();

    // Unhinged refused without verification, for the caller and while the partner is unverified.
    const refused = await a.request.post("/api/dark/consent", {
      data: { tiers: ["Flirty", "Steamy", "Spicy", "Unhinged"] },
    });
    expect(refused.status()).toBe(403);
    await verify(a);
    expect(
      (
        await a.request.post("/api/dark/consent", {
          data: { tiers: ["Flirty", "Steamy", "Spicy", "Unhinged"] },
        })
      ).ok(),
    ).toBeTruthy();
    expect(
      (
        await b.request.post("/api/dark/consent", {
          data: { tiers: ["Flirty", "Steamy", "Spicy", "Unhinged"] },
        })
      ).status(),
    ).toBe(403); // B unverified
    expect(
      (
        await b.request.post("/api/dark/consent", {
          data: { tiers: ["Flirty", "Steamy", "Spicy"] },
        })
      ).ok(),
    ).toBeTruthy();
    expect((await (await a.request.get("/api/dark/state")).json()).rank).toBe(3); // Unhinged stays shut until both verify
    const req = await a.request.post("/api/dark/requests", { data: {} });
    expect(req.status()).toBe(403);

    // Either partner can lower any time: B drops to Flirty, both are now at Flirty.
    await b.request.post("/api/dark/consent", { data: { tiers: ["Flirty"] } });
    expect((await (await a.request.get("/api/dark/state")).json()).rank).toBe(1);
  });

  test("MUST-PASS: desire match never reveals a No, not even through the API or database", async ({
    couple,
  }) => {
    const { a, b, theo } = couple;
    await setUp(a, ["Flirty"]);
    await setUp(b, ["Flirty"]);
    const { items } = await (await a.request.get("/api/dark/match")).json();
    const [i1, i2, i3] = items;
    await a.request.post("/api/dark/match", { data: { itemId: i1.id, answer: "yes" } });
    await b.request.post("/api/dark/match", { data: { itemId: i1.id, answer: "yes" } });
    await a.request.post("/api/dark/match", { data: { itemId: i2.id, answer: "yes" } });
    await b.request.post("/api/dark/match", { data: { itemId: i2.id, answer: "no" } });
    await a.request.post("/api/dark/match", { data: { itemId: i3.id, answer: "maybe" } });
    await b.request.post("/api/dark/match", { data: { itemId: i3.id, answer: "yes" } });
    const mine = await (await a.request.get("/api/dark/match")).json();
    expect(mine.matches.map((m: { item_id: string }) => m.item_id).sort()).toEqual(
      [i1.id, i3.id].sort(),
    );
    const raw = JSON.stringify(mine);
    expect(raw).not.toContain('"no"');
    expect(mine.mine[i2.id]).toBe("yes"); // only my own answers come back
    expect(Object.keys(mine.mine)).not.toContain("theirs");
    // Straight to PostgREST as Theo: no access at all.
    const c = await asUser(theo);
    const { data, error } = await c.from("desire_answers").select("*");
    expect(data ?? []).toEqual([]);
    expect(error).toBeTruthy();
  });

  test("MUST-PASS: View once can't be reopened, re-fetched or found after closing; storage returns nothing", async ({
    couple,
  }) => {
    const { a, b } = couple;
    await setUp(a, ["Flirty"]);
    await setUp(b, ["Flirty"]);
    // Upload refused until the one-time screenshot notice is seen (SAF-06).
    const early = await a.request.post("/api/media/upload-url", {
      data: { kind: "image", mime: "image/jpeg", size: 1000, sensitive: true },
    });
    expect(early.status()).toBe(428);
    await a.request.post("/api/dark/notice");
    const id = await sendSensitive(a, "once");
    expect((await a.request.get(`/api/media/${id}/view`)).status()).toBe(403); // sender can't open their own View once
    const first = await b.request.get(`/api/media/${id}/view`);
    expect(first.status()).toBe(200);
    expect(first.headers()["cache-control"]).toContain("no-store");
    const bytes = await first.body();
    expect((await sharp(bytes).metadata()).exif).toBeUndefined(); // EXIF gone, watermark burned in
    expect((await b.request.post(`/api/media/${id}/viewed`)).ok()).toBeTruthy();
    expect((await b.request.get(`/api/media/${id}/view`)).status()).toBe(410);
    const { data: row } = await admin
      .from("media")
      .select("storage_path, storage_verified_gone_at")
      .eq("id", id)
      .single();
    expect(row!.storage_verified_gone_at).toBeTruthy();
    const { data: blob } = await admin.storage.from("sensitive").download(row!.storage_path);
    expect(blob).toBeNull();
    // Locked After Dark: no bytes at all.
    await b.request.post("/api/dark/lock");
    const id2 = await sendSensitive(a, "24h");
    expect((await b.request.get(`/api/media/${id2}/view`)).status()).toBe(401);
  });

  test("MUST-PASS: expired and unsent media are gone from storage, not just hidden", async ({
    couple,
  }) => {
    const { a, b } = couple;
    await setUp(a, ["Flirty"]);
    await setUp(b, ["Flirty"]);
    await a.request.post("/api/dark/notice");
    const expiring = await sendSensitive(a, "24h");
    const unsent = await sendSensitive(a, "24h");
    await admin
      .from("media")
      .update({ expires_at: new Date(Date.now() - 1000).toISOString() })
      .eq("id", expiring);
    expect((await b.request.get(`/api/media/${expiring}/view`)).status()).toBe(410);
    const job = await a.request.post("/api/jobs/tick", {
      headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
    });
    expect(job.ok()).toBeTruthy();
    expect((await a.request.delete(`/api/media/${unsent}`)).ok()).toBeTruthy();
    expect((await b.request.delete(`/api/media/${expiring}`)).status()).toBe(404); // only the sender can unsend
    for (const id of [expiring, unsent]) {
      const { data: m } = await admin
        .from("media")
        .select("storage_path, deleted_at")
        .eq("id", id)
        .single();
      expect(m!.deleted_at).toBeTruthy();
      expect((await admin.storage.from("sensitive").download(m!.storage_path)).data).toBeNull();
      expect((await b.request.get(`/api/media/${id}/view`)).status()).toBe(410);
    }
    // A kept item that the sender unsends shows "Removed by sender" in the partner's vault.
    await a.request.post("/api/couple/allow-saved", { data: { allow: true } });
    await b.request.post("/api/couple/allow-saved", { data: { allow: true } });
    const kept = await sendSensitive(a, "vault");
    await b.goto("/dark/vault");
    await expect(b.getByRole("link", { name: /Tap to reveal/ }).first()).toBeVisible();
    await a.request.delete(`/api/media/${kept}`);
    await b.reload();
    await expect(b.getByText("Removed by sender").first()).toBeVisible();
  });

  test("flow 10.5: nude request, Not right now, 12 h cooldown, no reminders; refused unless both verified", async ({
    couple,
  }) => {
    const { a, b } = couple;
    await setUp(a, ["Flirty", "Steamy", "Spicy"]);
    await setUp(b, ["Flirty", "Steamy", "Spicy"]);
    await verify(a);
    await a.request.post("/api/dark/consent", {
      data: { tiers: ["Flirty", "Steamy", "Spicy", "Unhinged"] },
    });
    expect((await a.request.post("/api/dark/requests", { data: {} })).status()).toBe(403);
    await verify(b);
    await b.request.post("/api/dark/consent", {
      data: { tiers: ["Flirty", "Steamy", "Spicy", "Unhinged"] },
    });
    expect(
      (
        await a.request.post("/api/dark/requests", { data: { note: "something just for me?" } })
      ).status(),
    ).toBe(201);
    await b.goto("/dark/request");
    await expect(b.getByText('"something just for me?"')).toBeVisible();
    await b.getByRole("button", { name: "Not right now" }).click();
    await expect(b.getByText("Sent: Not right now.")).toBeVisible();
    const s = await (await a.request.get("/api/dark/requests")).json();
    expect(s.sent.status).toBe("not_right_now");
    expect(JSON.stringify(s)).not.toContain("declined");
    const again = await a.request.post("/api/dark/requests", { data: {} });
    expect(again.status()).toBe(429);
    expect((await again.json()).message).toContain("Not right now");
    const { data: logs } = await admin
      .from("notification_log")
      .select("id")
      .eq("user_id", couple.theo.id)
      .ilike("dedupe_key", "%request%");
    expect(logs ?? []).toEqual([]);
  });

  test("flow 10.6: unlink wipes every sensitive item for both and returns both to linking", async ({
    couple,
  }) => {
    const { a, b } = couple;
    await setUp(a, ["Flirty"]);
    await setUp(b, ["Flirty"]);
    await a.request.post("/api/dark/notice");
    await b.request.post("/api/dark/notice");
    const ids = [
      await sendSensitive(a, "vault"),
      await sendSensitive(a, "once"),
      await sendSensitive(b, "7d"),
    ];
    const { token } = await (
      await a.request.post("/api/couple/unlink", { data: { step: "start" } })
    ).json();
    expect(
      (
        await a.request.post("/api/couple/unlink", {
          data: { step: "confirm", token: "forged.token" },
        })
      ).status(),
    ).toBe(400);
    expect(
      (await a.request.post("/api/couple/unlink", { data: { step: "confirm", token } })).ok(),
    ).toBeTruthy();
    for (const id of ids) {
      const { data: m } = await admin
        .from("media")
        .select("storage_path, storage_verified_gone_at")
        .eq("id", id)
        .single();
      expect(m!.storage_verified_gone_at).toBeTruthy();
      expect((await admin.storage.from("sensitive").download(m!.storage_path)).data).toBeNull();
    }
    const { data: job } = await admin
      .from("wipe_jobs")
      .select("verified_at, objects_deleted")
      .order("requested_at", { ascending: false })
      .limit(1)
      .single();
    expect(job!.verified_at).toBeTruthy();
    await b.goto("/us");
    await expect(b).toHaveURL(/\/link/);
    await a.goto("/chat");
    await expect(a).toHaveURL(/\/link/);
  });

  test("flow 10.4: spin within unlocked tiers, Pass is free, Spin again works", async ({
    couple,
  }) => {
    const { a, b } = couple;
    await setUp(a, ["Flirty", "Steamy"]);
    await setUp(b, ["Flirty", "Steamy"]);
    const tiers = new Set<string>();
    for (let i = 0; i < 12; i++) {
      const s = await (await a.request.post("/api/dark/wheel")).json();
      tiers.add(s.tier);
      await a.request.post(`/api/dark/wheel/${s.spinId}`, {
        data: { outcome: i % 2 ? "passed" : "respun" },
      });
    }
    expect([...tiers].every((t) => t === "Flirty" || t === "Steamy")).toBe(true);
    await a.goto("/dark/wheel");
    await a.getByRole("button", { name: "Spin" }).click();
    await expect(a.getByText("Swipe across the strip to strike")).toBeVisible({ timeout: 6000 });
    await a.getByRole("button", { name: "Or tap to strike" }).click();
    await a.getByRole("button", { name: "Pass" }).click();
    await expect(a.getByText("Passed. No big deal.")).toBeVisible();
  });
});
