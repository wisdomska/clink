import { test, expect } from "./fixtures";
import type { Page } from "@playwright/test";

async function ready(p: Page) {
  expect(
    (await p.request.post("/api/dark/setup", { data: { pin: "2611", tiers: ["Flirty"] } })).ok(),
  ).toBeTruthy();
  await p.request.post("/api/dark/notice");
}

// DARK-03: one deck per tier with 50+ cards; both answer; answers reveal together.
test("question deck answers stay sealed until both have answered", async ({ couple }) => {
  const { a, b } = couple;
  await ready(a);
  await ready(b);

  const first = await (await a.request.get("/api/dark/decks/Flirty")).json();
  expect(first.total).toBeGreaterThanOrEqual(50);
  const cardId = first.card.id as string;
  const secret = `only after you ${Date.now()}`;
  const r = await a.request.post("/api/dark/decks/Flirty", { data: { cardId, answer: secret } });
  expect((await r.json()).revealed).toBe(false);

  // Theo sees that Nia answered, never what she said.
  const forB = await b.request.get("/api/dark/decks/Flirty");
  const raw = await forB.text();
  expect(raw).not.toContain(secret);
  const bView = JSON.parse(raw);
  expect(bView.card.id).toBe(cardId);
  expect(bView.card.partnerAnswered).toBe(true);
  expect(bView.reveal).toBeNull();

  const mine = `me too ${Date.now()}`;
  const r2 = await b.request.post("/api/dark/decks/Flirty", { data: { cardId, answer: mine } });
  expect((await r2.json()).revealed).toBe(true);
  for (const p of [a, b]) {
    const v = await (await p.request.get("/api/dark/decks/Flirty")).json();
    expect(v.reveal.cardId).toBe(cardId);
    expect([v.reveal.mine, v.reveal.theirs].sort()).toEqual([mine, secret].sort());
  }

  // Decks above the agreed tier stay shut.
  expect((await a.request.get("/api/dark/decks/Spicy")).ok()).toBe(false);
});
