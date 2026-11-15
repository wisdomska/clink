import { randomUUID } from "node:crypto";
import { test, expect } from "./fixtures";

test("spicy stickers need you both in After Dark; then they send", async ({ couple }) => {
  const { a, b } = couple;
  await a.goto("/chat");
  await a.getByRole("button", { name: "Stickers" }).click();
  await a.getByRole("tab", { name: /Spicy/ }).click();
  await expect(a.getByText(/Spicy stickers open when you both turn on After Dark/)).toBeVisible();
  const refused = await a.request.post("/api/messages", {
    data: { clientId: randomUUID(), type: "sticker", stickerId: "spicy-wink" },
  });
  expect(refused.status()).toBe(403);

  for (const p of [a, b])
    await p.request.post("/api/dark/setup", { data: { pin: "2611", tiers: ["Flirty"] } });
  await a.reload();
  await b.goto("/chat");
  await a.getByRole("button", { name: "Stickers" }).click();
  await a.getByRole("tab", { name: /Spicy/ }).click();
  await a.getByRole("button", { name: "Send sticker tonight?" }).click();
  await expect(b.getByRole("img", { name: "Sticker: tonight?" })).toBeVisible({ timeout: 10000 });
});
