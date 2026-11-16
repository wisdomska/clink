import sharp from "sharp";
import { test, expect } from "./fixtures";
import { admin } from "./helpers";
import type { Page } from "@playwright/test";

async function ready(p: Page) {
  expect(
    (await p.request.post("/api/dark/setup", { data: { pin: "2611", tiers: ["Flirty"] } })).ok(),
  ).toBeTruthy();
  await p.request.post("/api/dark/notice");
}

async function sendPhoto(p: Page) {
  const img = await sharp({
    create: { width: 400, height: 500, channels: 3, background: "#FF5A3C" },
  })
    .jpeg()
    .toBuffer();
  const up = await p.request.post("/api/media/upload-url", {
    data: { kind: "image", mime: "image/jpeg", size: img.length, sensitive: true, retention: "7d" },
  });
  const { id, upload } = await up.json();
  await p.request.fetch(upload.url, { method: "PUT", headers: upload.headers, data: img });
  expect((await p.request.post(`/api/media/${id}/complete`)).ok()).toBeTruthy();
  expect((await p.request.post("/api/dark/send", { data: { mediaId: id } })).ok()).toBeTruthy();
  return id as string;
}

test.describe("After Dark safety (SAF-07, SAF-08)", () => {
  test("SAF-07: switching away hides private media and logs it", async ({ couple }) => {
    const { a, b, theo } = couple;
    await ready(a);
    await ready(b);
    const id = await sendPhoto(a);
    await b.goto(`/dark/view/${id}`);
    await b.getByRole("button", { name: /Tap to reveal/ }).click();
    await expect(b.getByRole("img", { name: "Private photo" })).toBeVisible();
    await b.evaluate(() => window.dispatchEvent(new Event("blur")));
    await expect(b.getByText("Hidden while you were away. Tap to show.")).toBeVisible();
    await expect
      .poll(async () => {
        const { data } = await admin
          .from("sensitive_view_events")
          .select("event")
          .eq("media_id", id)
          .eq("viewer_id", theo.id);
        return data?.map((e) => e.event);
      })
      .toContain("blur");
  });

  test("SAF-08: block from inside After Dark unlinks and wipes for both", async ({ couple }) => {
    const { a, b, nia, theo } = couple;
    await ready(a);
    await ready(b);
    const id = await sendPhoto(b);
    await a.goto("/dark/home");
    await a.getByRole("button", { name: /Report or block/ }).click();
    await a.getByRole("button", { name: "Block and unlink" }).click();
    await a.waitForURL("**/link");
    const { data: block } = await admin
      .from("user_blocks")
      .select("blocked_id")
      .eq("blocker_id", nia.id);
    expect(block?.map((r) => r.blocked_id)).toEqual([theo.id]);
    const { data: m } = await admin
      .from("media")
      .select("storage_verified_gone_at")
      .eq("id", id)
      .single();
    expect(m!.storage_verified_gone_at).toBeTruthy();
    await b.goto("/us");
    await expect(b.getByRole("heading", { name: "Link with your partner" })).toBeVisible();
  });
});
