import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { test, expect } from "./fixtures";
import { admin } from "./helpers";

test("edit a message, search the chat, browse media, and see On this day", async ({ couple }) => {
  const { a, b, nia } = couple;
  await b.goto("/chat");
  await a.goto("/chat");
  await a.getByRole("textbox", { name: "Message Theo" }).fill("dinner at 8 tonite");
  await a.getByRole("button", { name: "Send", exact: true }).click();
  await expect(b.getByText("dinner at 8 tonite")).toBeVisible({ timeout: 10000 });

  // Edit (WhatsApp style).
  await a.getByRole("button", { name: /You: dinner at 8 tonite/ }).click({ button: "right" });
  await a.getByRole("button", { name: "Edit", exact: true }).click();
  await expect(a.getByText("Editing message")).toBeVisible();
  await a.getByRole("textbox", { name: "Message Theo" }).fill("dinner at 8 tonight");
  await a.getByRole("button", { name: "Send", exact: true }).click();
  await expect(b.getByText("dinner at 8 tonight")).toBeVisible({ timeout: 10000 });
  await expect(b.getByText(/edited ·/)).toBeVisible();
  // The stamp sits inside its bubble, never hanging under the next one.
  const stamp = b.getByText(/edited ·/);
  const bubble = stamp.locator("xpath=..");
  const sb = (await stamp.boundingBox())!;
  const bb = (await bubble.boundingBox())!;
  expect(sb.y + sb.height).toBeLessThanOrEqual(bb.y + bb.height + 0.5);

  // Search.
  await a.getByRole("button", { name: "More" }).click();
  await a.getByRole("button", { name: "Search messages" }).click();
  await a.getByRole("textbox", { name: "Search messages" }).fill("tonight");
  await expect(a.getByText("1 found")).toBeVisible();
  await a
    .getByRole("button", { name: /dinner at 8/ })
    .last()
    .click();
  await expect(a.getByRole("dialog", { name: "Search messages" })).toBeHidden();

  // A photo from a year ago today shows on Us, and in the gallery.
  const coupleId = (
    await admin.from("couple_members").select("couple_id").eq("user_id", nia.id).single()
  ).data!.couple_id;
  const img = await sharp({
    create: { width: 400, height: 300, channels: 3, background: "#E68AF5" },
  })
    .jpeg()
    .toBuffer();
  const up = await a.request.post("/api/media/upload-url", {
    data: { kind: "image", mime: "image/jpeg", size: img.length },
  });
  const { id, upload } = await up.json();
  await a.request.fetch(upload.url, { method: "PUT", headers: upload.headers, data: img });
  expect((await a.request.post(`/api/media/${id}/complete`)).ok()).toBeTruthy();
  const lastYear = new Date();
  lastYear.setFullYear(lastYear.getFullYear() - 1);
  await admin
    .from("media")
    .update({ created_at: lastYear.toISOString(), status: "ready" })
    .eq("id", id);
  await a.request.post("/api/messages", {
    data: { clientId: randomUUID(), type: "media", mediaIds: [id] },
  });
  void coupleId;
  await a.goto("/us");
  await expect(a.getByText("1 year ago today")).toBeVisible({ timeout: 10000 });
  await a.goto("/chat/media");
  await expect(a.getByRole("link", { name: "Photo" }).first()).toBeVisible();
});

test("Enter starts a new line in the composer; Send sends the whole message", async ({
  couple,
}) => {
  const { a, b } = couple;
  await b.goto("/chat");
  await a.goto("/chat");
  const box = a.getByRole("textbox", { name: "Message Theo" });
  await box.click();
  await a.keyboard.type("first line");
  await a.keyboard.press("Enter");
  await a.keyboard.type("second line");
  await expect(box).toHaveValue("first line\nsecond line");
  // Nothing was sent by Enter.
  await expect(b.getByText("first line")).toHaveCount(0);
  await a.getByRole("button", { name: "Send", exact: true }).click();
  await expect(box).toHaveValue("");
  await expect(b.getByText(/first line\s+second line/)).toBeVisible();
});
