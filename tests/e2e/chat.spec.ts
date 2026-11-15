import sharp from "sharp";
import { test, expect } from "./fixtures";
import { admin } from "./helpers";
import { expectNoHorizontalScroll } from "./no-horizontal-scroll";

test.describe("Chat (CHAT-01 to CHAT-05)", () => {
  test("text, typing, read receipt, reaction and the empty state", async ({ couple }) => {
    const { a, b } = couple;
    await a.goto("/chat");
    await b.goto("/chat");
    await expect(a.getByText("Say something.")).toBeVisible();
    await expectNoHorizontalScroll(a);
    await a.waitForTimeout(1500);

    await b.getByLabel("Message Nia").fill("made jollof. saving you none");
    await expect(a.getByLabel("Theo is typing")).toBeVisible({ timeout: 5000 });
    await b.getByRole("button", { name: "Send" }).click();
    await expect(a.getByText("made jollof. saving you none")).toBeVisible({ timeout: 5000 });

    await a.getByLabel("Message Theo").fill("rude. at least send proof");
    await a.getByRole("button", { name: "Send" }).click();
    await expect(b.getByText("rude. at least send proof")).toBeVisible({ timeout: 5000 });
    await expect(a.getByText(/^Read \d\d:\d\d$/)).toBeVisible({ timeout: 8000 });

    // Long-press (context menu) opens reactions.
    await b.getByText("rude. at least send proof").click({ button: "right" });
    await b.getByRole("button", { name: "React 😭" }).click();
    await expect(a.getByLabel(/Reactions: 😭/)).toBeVisible({ timeout: 5000 });
  });

  test("offline queue: a message written offline sends itself when back online", async ({
    couple,
  }) => {
    const { a, b, ctxA, nia } = couple;
    await a.goto("/chat");
    await b.goto("/chat");
    await a.waitForTimeout(1200);
    await ctxA.setOffline(true);
    await a.getByLabel("Message Theo").fill("ok fine. sunday call?");
    await a.getByRole("button", { name: "Send" }).click();
    await expect(a.getByText("Not sent. Tap to retry")).toBeVisible({ timeout: 8000 });
    await expect(a.getByText("You're offline.")).toBeVisible();
    await ctxA.setOffline(false);
    await expect(b.getByText("ok fine. sunday call?")).toBeVisible({ timeout: 15000 });
    await expect(a.getByText("Not sent. Tap to retry")).toBeHidden();
    // Exactly one copy despite retries (client_id idempotency).
    const { data } = await admin
      .from("messages")
      .select("id")
      .eq("body", "ok fine. sunday call?")
      .eq("sender_id", nia.id);
    expect(data?.length).toBe(1);
  });

  test("photo upload: EXIF and GPS are stripped on the server (SAF-03)", async ({ couple }) => {
    const { a, b } = couple;
    // A JPEG carrying camera and copyright EXIF.
    const jpeg = await sharp({
      create: { width: 1200, height: 900, channels: 3, background: "#E68AF5" },
    })
      .withExif({ IFD0: { Make: "TestCam", Model: "Leaky 1", Copyright: "Nia home address" } })
      .jpeg()
      .toBuffer();
    expect((await sharp(jpeg).metadata()).exif).toBeTruthy();

    await a.goto("/chat");
    await b.goto("/chat");
    await a
      .getByTestId("attach-input")
      .setInputFiles({ name: "proof.jpg", mimeType: "image/jpeg", buffer: jpeg });
    await a.getByRole("button", { name: /^Send to / }).click();
    await expect(b.getByRole("link", { name: "Open media" })).toBeVisible({ timeout: 20000 });

    const { data: media } = await admin
      .from("media")
      .select("storage_path, mime, status")
      .eq("kind", "image")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    expect(media?.status).toBe("ready");
    const { data: blob } = await admin.storage.from("media").download(media!.storage_path);
    const meta = await sharp(Buffer.from(await blob!.arrayBuffer())).metadata();
    expect(meta.exif).toBeUndefined();
    expect(meta.format).toBe("webp");
    expect(Math.max(meta.width!, meta.height!)).toBeLessThanOrEqual(2048);
  });
});
