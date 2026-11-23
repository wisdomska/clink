import { randomUUID } from "node:crypto";
import type { Page } from "@playwright/test";
import { test, expect } from "../e2e/fixtures";
import { admin } from "../e2e/helpers";

// Visual regression for the signed-in screens (Us, Chat, Play), so a layout
// break shows up here before anyone sees it on a device. Rendered in
// Playwright's Docker image like the public pages (scripts/visual.sh). Things
// that change by themselves (clocks, today's date, the daily ritual question,
// the weather) are pinned or masked.
const NOW = new Date("2026-11-13T21:14:00Z");

async function prepare(p: Page) {
  await p.clock.setFixedTime(NOW);
  await p.route("**/api/weather?**", (r) => r.fulfill({ json: { temp: 18, label: "Clear" } }));
}

const shot = async (p: Page) => {
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(600);
  await expect(p).toHaveScreenshot({
    fullPage: true,
    animations: "disabled",
    maxDiffPixelRatio: 0.015,
    mask: [
      // Times of day and today's date, which follow the server's clock.
      p.getByText(/\b\d{1,2}:\d{2}\b/),
      p.getByText(/\b(19|20)\d{2}\b/),
      p.getByText(/Today's ritual/),
      p.locator("#ritual-h"),
      // Today's ladder: a different puzzle every day.
      p.locator('a[href="/play/ladder"] .text-muted'),
    ],
  });
};

test("looks the same: Us", async ({ couple }) => {
  const { a } = couple;
  await prepare(a);
  await a.goto("/us");
  await expect(a.getByRole("button", { name: /Send a Clink/ })).toBeVisible({ timeout: 20000 });
  await shot(a);
});

test("looks the same: Chat", async ({ couple }) => {
  const { a, nia, theo } = couple;
  const coupleId = (
    await admin.from("couple_members").select("couple_id").eq("user_id", nia.id).single()
  ).data!.couple_id as string;
  // A short conversation at fixed times, already read.
  const at = (m: number) => new Date(Date.UTC(2026, 10, 12, 19, m)).toISOString();
  const lines: Array<[string, string]> = [
    [theo.id, "Landed. It's raining, obviously."],
    [nia.id, "Send me the sound of it"],
    [theo.id, "Call in 10? Making tea first"],
    [nia.id, "Deal. Wear the green jumper"],
  ];
  await admin.from("messages").insert(
    lines.map(([sender, body], i) => ({
      couple_id: coupleId,
      sender_id: sender,
      client_id: randomUUID(),
      type: "text",
      body,
      sent_at: at(i * 2),
      read_at: at(i * 2 + 1),
      delivered_at: at(i * 2),
    })),
  );
  await prepare(a);
  await a.goto("/chat");
  await expect(a.getByText("Deal. Wear the green jumper")).toBeVisible({ timeout: 20000 });
  await shot(a);
});

test("looks the same: Play", async ({ couple }) => {
  const { a } = couple;
  await prepare(a);
  await a.goto("/play");
  await expect(a.getByRole("heading", { level: 1 }).first()).toBeVisible({ timeout: 20000 });
  // The clock is pinned to another day, so the ladder card shows its steady default line.
  await expect(a.getByRole("link", { name: /Daily ladder/ })).toBeVisible();
  await shot(a);
});
