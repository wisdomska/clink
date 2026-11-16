import { test, expect } from "./fixtures";
import type { Page } from "@playwright/test";

async function pressAndHold(p: Page) {
  const btn = p.getByRole("button", { name: "Send a Clink. Hold to glow together." });
  const box = (await btn.boundingBox())!;
  await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await p.mouse.down();
}

// HOME-03: both hold the Clink button at once; screens glow and count seconds together.
test("hold together glows on both screens and counts the seconds", async ({ couple }) => {
  const { a, b } = couple;
  await a.goto("/us");
  await b.goto("/us");
  await pressAndHold(a);
  await pressAndHold(b);
  await expect(a.getByRole("dialog", { name: /Holding together/ })).toBeVisible({
    timeout: 10000,
  });
  await expect(b.getByRole("dialog", { name: /Holding together/ })).toBeVisible();
  await a.waitForTimeout(2200);
  await a.mouse.up();
  await b.mouse.up();
  await expect(a.getByText(/Held together for \d+ s/)).toBeVisible();
});

// Holding alone calls your partner in: a card wherever they are, a push if
// they're away. Holding on together brings a moment at 5 s, 10 s and beyond.
test("holding alone invites your partner; 5 s together is a moment", async ({ couple }) => {
  const { a, b } = couple;
  await a.goto("/us");
  await b.goto("/chat");
  const call = a.waitForRequest((r) => r.url().includes("/api/clinks/hold-call"));
  await pressAndHold(a);
  await call;

  // Theo is in Chat: a card asks him to hold too.
  const invite = b.getByRole("alertdialog", { name: /is holding the Clink/ });
  await expect(invite).toBeVisible({ timeout: 10000 });
  const join = invite.getByRole("button", { name: "Hold too" });
  const box = (await join.boundingBox())!;
  await b.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await b.mouse.down();

  await expect(b.getByRole("dialog", { name: /Holding together/ })).toBeVisible();
  await expect(a.getByRole("status").filter({ hasText: "5 s together: In sync" })).toBeVisible({
    timeout: 12000,
  });
  await expect(b.getByRole("dialog", { name: "In sync" })).toBeVisible();
  await a.mouse.up();
  await b.mouse.up();
  await expect(a.getByText(/Held together for \d+ s\. In sync\./)).toBeVisible();
});
