import { createClient } from "@supabase/supabase-js";
import { test, expect } from "./fixtures";
import { admin } from "./helpers";
import { expectNoHorizontalScroll } from "./no-horizontal-scroll";

test.describe("Plans (DATE) and Keep (KEEP)", () => {
  test("schedule a kit, see the stub in both time zones, tear it off onto the timeline", async ({
    couple,
  }) => {
    const { a, b } = couple;
    await a.goto("/plans");
    await expect(a.getByText("The booth is empty.")).toBeVisible();
    await expectNoHorizontalScroll(a);
    await a.getByRole("link", { name: /Stargazing/ }).click();
    await a.getByRole("button", { name: "Schedule it" }).click();
    await expect(a.getByText(/THAT'S .* FOR THEO/)).toBeVisible();
    await a.getByRole("button", { name: "Book it" }).click();
    await expect(a.getByText(/Stargazing scheduled/)).toBeVisible();
    await b.goto("/plans");
    await expect(b.getByText("ADMIT TWO")).toBeVisible();
    await expect(b.getByText(/Accra/).first()).toBeVisible();
    await b.getByRole("button", { name: /Tear the stub/ }).click();
    await expect(b.getByText("Torn off. Added to your timeline.")).toBeVisible();
    await a.goto("/keep/timeline");
    await expect(a.getByText("Date night: Stargazing")).toBeVisible();
  });

  test("challenge: both tick today and the streak counts", async ({ couple }) => {
    const { a, b } = couple;
    await a.goto("/plans/challenges/new");
    await a.getByRole("button", { name: /A voice note a day/ }).click();
    await expect(a.getByText(/DAY 1 OF 30/)).toBeVisible();
    await a.getByRole("button", { name: "Tick off today" }).click();
    await expect(a.getByText("Ticked. Waiting on Theo.")).toBeVisible();
    await b.goto("/plans");
    await b.getByRole("link", { name: /A voice note a day/ }).click();
    await b.getByRole("button", { name: "Tick off today" }).click();
    await expect(b.getByText("Both done today. Streak safe.")).toBeVisible();
    await expect(b.locator(".mono.text-\\[48px\\]")).toHaveText("1");
  });

  test("Open When letter: sealed until the partner breaks the seal; the writer is told", async ({
    couple,
  }) => {
    const { a, b } = couple;
    await a.goto("/keep");
    await a.getByRole("button", { name: "Write one" }).click();
    await a.getByRole("radio", { name: "you can't sleep" }).click();
    await a
      .getByLabel("Your letter")
      .fill("Put the phone down after this. Four in, hold, six out.");
    await a.getByRole("button", { name: "Seal it" }).click();
    await expect(a.getByText("Sealed by you")).toBeVisible();
    await b.goto("/keep");
    await b.getByRole("link", { name: /Open when you can't sleep/ }).click();
    await expect(b.getByText("Four in, hold, six out.")).toBeHidden();
    await b.getByRole("button", { name: "Break the seal" }).click();
    await expect(b.getByText(/Four in, hold, six out\./)).toBeVisible();
    await a.reload();
    await expect(a.getByText("OPENED", { exact: true })).toBeVisible();
  });

  test("MUST-PASS: capsules cannot be read before unlock time, even by direct API or database call", async ({
    couple,
  }) => {
    const { a, b, theo } = couple;
    await a.goto("/keep");
    const unlockAt = new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString();
    const res = await a.request.post("/api/capsules", {
      data: { title: "Valentine's, sealed", unlockAt, body: "Prediction: same city by then." },
    });
    expect(res.status()).toBe(201);
    const { id } = await res.json();
    for (const p of [a, b]) {
      const r = await p.request.get(`/api/capsules/${id}`);
      expect(r.status()).toBe(423);
      expect(JSON.stringify(await r.json())).not.toContain("Prediction");
      expect((await p.request.post(`/api/capsules/${id}/open`)).status()).toBe(423);
    }
    // Straight to PostgREST with Theo's own session: RLS returns nothing.
    const { data: link } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email: theo.email,
    });
    const anon = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } },
    );
    await anon.auth.verifyOtp({ token_hash: link.properties!.hashed_token, type: "magiclink" });
    const { data: rows } = await anon.from("capsule_contents").select("body").eq("capsule_id", id);
    expect(rows).toEqual([]);
    await b.goto(`/keep/capsules/${id}`);
    await expect(b.getByRole("timer")).toBeVisible();
    await expect(b.getByText("Prediction")).toBeHidden();

    // Once the date passes, both can uncork it.
    await admin
      .from("capsules")
      .update({
        unlock_at: new Date(Date.now() - 1000).toISOString(),
        created_at: new Date(Date.now() - 2000).toISOString(),
      })
      .eq("id", id);
    await b.reload();
    await b.getByRole("button", { name: "Uncork it" }).click();
    await expect(b.getByText("Prediction: same city by then.")).toBeVisible();
  });

  test("cron job routes refuse callers without the secret", async ({ couple }) => {
    expect((await couple.a.request.post("/api/jobs/tick")).status()).toBe(403);
    expect(
      (
        await couple.a.request.post("/api/jobs/tick", { headers: { Authorization: "Bearer nope" } })
      ).status(),
    ).toBe(403);
    const ok = await couple.a.request.post("/api/jobs/tick", {
      headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
    });
    expect(ok.status()).toBe(200);
  });
});
