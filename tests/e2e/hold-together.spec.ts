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
