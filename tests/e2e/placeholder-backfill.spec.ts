import sharp from "sharp";
import type { Page } from "@playwright/test";
import { test, expect } from "./fixtures";
import { admin } from "./helpers";

async function oldPhoto(p: Page, colour: string) {
  const img = await sharp({ create: { width: 640, height: 480, channels: 3, background: colour } })
    .jpeg()
    .toBuffer();
  // Uploaded without a preview, like photos shared before previews existed.
  const up = await p.request.post("/api/media/upload-url", {
    data: { kind: "image", mime: "image/jpeg", size: img.length },
  });
  const { id, upload } = await up.json();
  await p.request.fetch(upload.url, { method: "PUT", headers: upload.headers, data: img });
  expect((await p.request.post(`/api/media/${id}/complete`)).ok()).toBeTruthy();
  await admin.from("media").update({ placeholder: null }).eq("id", id);
  return id as string;
}

test("older photos get a blurred preview in the background; sensitive media never does", async ({
  couple,
}) => {
  test.setTimeout(120_000);
  const { a } = couple;
  const photo = await oldPhoto(a, "#3C8CFF");
  const secret = await oldPhoto(a, "#FF3C8C");
  const marked = await admin
    .from("media")
    .update({ bucket: "sensitive", is_sensitive: true, retention: "vault" })
    .eq("id", secret);
  expect(marked.error).toBeNull();

  const row = (id: string) =>
    admin.from("media").select("placeholder, placeholder_tried_at").eq("id", id).single();
  // Each run does a few (other tests' photos too), so give it a few runs.
  await expect(async () => {
    const r = await a.request.post("/api/jobs/tick", {
      headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
    });
    expect(r.ok()).toBeTruthy();
    expect((await row(photo)).data?.placeholder).toMatch(/^data:image\/webp;base64,/);
  }).toPass({ timeout: 90_000, intervals: [500, 1000, 2000] });

  const p = (await row(photo)).data!;
  expect(p.placeholder!.length).toBeLessThanOrEqual(2000);
  expect(p.placeholder_tried_at).not.toBeNull();
  // The sensitive one was never even looked at.
  expect((await row(secret)).data).toEqual({ placeholder: null, placeholder_tried_at: null });
});
