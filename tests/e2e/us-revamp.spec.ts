import { randomUUID } from "node:crypto";
import { test, expect } from "./fixtures";
import { admin } from "./helpers";

test("Us: custom status, 3D moods, missed call card with call back, picture stickers", async ({
  couple,
}) => {
  const { a, b, ctxA, nia, theo } = couple;
  const coupleId = (
    await admin.from("couple_members").select("couple_id").eq("user_id", nia.id).single()
  ).data!.couple_id;
  await a.goto("/us");
  await b.goto("/us");

  // Write your own status; Theo sees it.
  await a.getByRole("button", { name: /You .*Change your status/ }).click();
  await a.getByLabel("Or write your own").fill("on the train");
  await a.getByRole("button", { name: "Set", exact: true }).click();
  await expect(b.getByText("on the train")).toBeVisible({ timeout: 10000 });

  // Mood tiles are pictures now.
  await expect(a.getByRole("radio", { name: "Missing you" }).locator("img")).toBeVisible();

  // A missed call from Theo shows on Us for Nia, with call back.
  await admin.from("messages").insert({
    couple_id: coupleId,
    sender_id: theo.id,
    client_id: randomUUID(),
    type: "system",
    body: "call:missed:video:0",
  });
  await a.reload();
  await expect(a.getByText("Missed video call from Theo")).toBeVisible();
  await a.getByRole("button", { name: "Dismiss" }).click();
  await expect(a.getByText("Missed video call from Theo")).toBeHidden();

  // The call shows in the chat history with a Call button.
  await a.goto("/chat");
  await expect(a.getByText("Missed video call").first()).toBeVisible();
  await expect(a.getByRole("button", { name: "Call Theo back" })).toBeVisible();

  // Picture stickers.
  await a.getByRole("button", { name: "Stickers" }).click();
  await a.getByRole("button", { name: "Send sticker miss u" }).click();
  await b.goto("/chat");
  await expect(b.getByRole("img", { name: "Sticker: miss u" })).toBeVisible({ timeout: 10000 });
  await expect(b.locator('img[src="/stickers/miss-u.webp"]').first()).toBeVisible();
  void ctxA;
});
