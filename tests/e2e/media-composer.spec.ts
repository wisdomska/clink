import sharp from "sharp";
import { test, expect } from "./fixtures";
import { admin } from "./helpers";

const photo = (r: number, g: number, b: number) =>
  sharp({ create: { width: 800, height: 600, channels: 3, background: { r, g, b } } })
    .jpeg()
    .toBuffer();

// Pick photos, then polish before sending: rotate, filter, text, add more,
// remove one, caption. The partner gets one message with a grid and caption.
test("compose: edit, add more, caption, send as one grid", async ({ couple }) => {
  const { a, b, nia } = couple;
  await b.goto("/chat");
  await a.goto("/chat");
  await a
    .locator('input[type="file"]')
    .first()
    .setInputFiles([
      { name: "one.jpg", mimeType: "image/jpeg", buffer: await photo(230, 138, 245) },
      { name: "two.jpg", mimeType: "image/jpeg", buffer: await photo(80, 200, 190) },
    ]);
  const editor = a.getByRole("dialog", { name: "Edit before sending" });
  await expect(editor).toBeVisible();

  await editor.getByRole("button", { name: "Rotate" }).click();
  await editor.getByRole("button", { name: "Filters" }).click();
  await editor.getByRole("radio", { name: "Mono" }).click();
  await expect(editor.getByRole("radio", { name: "Mono" })).toHaveAttribute("aria-checked", "true");
  await editor.getByRole("button", { name: "Add text" }).click();
  await editor.getByLabel("Text on photo").fill("miss you");
  await expect(editor.locator(".cursor-grab", { hasText: "miss you" })).toBeVisible();

  await editor.getByTestId("composer-add").setInputFiles([
    { name: "three.jpg", mimeType: "image/jpeg", buffer: await photo(255, 200, 87) },
    { name: "four.jpg", mimeType: "image/jpeg", buffer: await photo(108, 184, 255) },
  ]);
  await expect(editor.getByRole("button", { name: /^Show photo/ })).toHaveCount(4);
  await editor.getByRole("button", { name: "Show photo 4" }).click();
  await editor.getByRole("button", { name: "Remove this one" }).click();
  await expect(editor.getByRole("button", { name: /^Show photo/ })).toHaveCount(3);

  await editor.getByLabel("Add a caption").fill("our weekend");
  await editor.getByRole("button", { name: /^Send to / }).click();
  await expect(editor).toBeHidden();

  await expect(b.getByRole("link", { name: "Open media" })).toHaveCount(3, { timeout: 25000 });
  await expect(b.getByText("our weekend")).toBeVisible();
  const { data } = await admin
    .from("messages")
    .select("body, media_ids")
    .eq("sender_id", nia.id)
    .eq("type", "media")
    .single();
  expect(data?.body).toBe("our weekend");
  expect(data?.media_ids).toHaveLength(3);
});
