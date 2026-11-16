import sharp from "sharp";
import { test, expect } from "./fixtures";
import { admin } from "./helpers";

// Hold a photo in chat, Add to Keep: it lands on the shared timeline.
test("a chat photo goes to Keep from the hold menu", async ({ couple }) => {
  const { a, b, nia } = couple;
  await a.goto("/chat");
  await a.getByTestId("attach-input").setInputFiles([
    {
      name: "beach.jpg",
      mimeType: "image/jpeg",
      buffer: await sharp({
        create: { width: 640, height: 480, channels: 3, background: { r: 240, g: 120, b: 90 } },
      })
        .jpeg()
        .toBuffer(),
    },
  ]);
  const editor = a.getByRole("dialog", { name: "Edit before sending" });
  await editor.getByLabel("Add a caption").fill("sunset swim");
  await editor.getByRole("button", { name: /^Send to / }).click();
  await expect(editor).toBeHidden();

  await b.goto("/chat");
  const bubble = b.getByRole("button", { name: /^Nia: media\..*Press for reactions/ });
  await expect(bubble).toBeVisible({ timeout: 25000 });
  await bubble.click({ button: "right" });
  await b.getByRole("button", { name: "Add to Keep", exact: true }).click();
  const sheet = b.getByRole("dialog", { name: "Add to Keep" });
  await sheet.getByLabel("Name it").fill("Sunset swim");
  await sheet.getByRole("button", { name: "Add to Keep" }).click();
  await expect(b.getByText("Added to Keep. It's on your timeline.")).toBeVisible();

  const { data: msg } = await admin
    .from("messages")
    .select("couple_id, media_ids")
    .eq("sender_id", nia.id)
    .eq("type", "media")
    .single();
  await expect
    .poll(async () => {
      const { data } = await admin
        .from("timeline_entries")
        .select("title, media_id")
        .eq("couple_id", msg!.couple_id)
        .eq("title", "Sunset swim");
      return data?.[0]?.media_id ?? null;
    })
    .toBe(msg!.media_ids[0]);

  await b.goto("/keep/timeline");
  await expect(b.getByText("Sunset swim")).toBeVisible();

  // A kept photo shows on the Memory wall too, for both of you.
  for (const page of [b, a]) {
    await page.goto("/keep");
    const wall = page.locator("section", {
      has: page.getByRole("heading", { name: "Memory wall" }),
    });
    await expect(wall.locator(`a[href="/chat/media/${msg!.media_ids[0]}"]`)).toBeVisible();
  }
});
