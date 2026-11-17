import { test, expect } from "./fixtures";
import type { Page } from "@playwright/test";

async function ready(p: Page) {
  expect(
    (await p.request.post("/api/dark/setup", { data: { pin: "2611", tiers: ["Flirty"] } })).ok(),
  ).toBeTruthy();
  await p.request.post("/api/dark/notice");
}

interface Card {
  id: string;
  mine: { answer: string | null; passed: boolean } | null;
  theirs: { answered: boolean; passed: boolean; answer: string | null } | null;
}

// DARK-03: one deck per tier with 50+ cards; both answer; answers reveal together.
test("question deck answers stay sealed until both have answered", async ({ couple }) => {
  const { a, b } = couple;
  await ready(a);
  await ready(b);

  const first = await (await a.request.get("/api/dark/decks/Flirty")).json();
  expect(first.total).toBeGreaterThanOrEqual(50);
  expect(first.cards).toHaveLength(first.total);
  expect(first.current).toBe(0);
  const cardId = first.cards[0].id as string;
  const secret = `only after you ${Date.now()}`;
  const r = await a.request.post("/api/dark/decks/Flirty", { data: { cardId, answer: secret } });
  const rj = await r.json();
  expect(rj.revealed).toBe(false);
  expect(rj.card.mine.answer).toBe(secret);

  // Theo sees that Nia answered, never what she said.
  const forB = await b.request.get("/api/dark/decks/Flirty");
  const raw = await forB.text();
  expect(raw).not.toContain(secret);
  const bView = JSON.parse(raw);
  expect(bView.current).toBe(0);
  expect(bView.cards[0].theirs.answered).toBe(true);
  expect(bView.cards[0].theirs.answer).toBeNull();

  const mine = `me too ${Date.now()}`;
  const r2 = await b.request.post("/api/dark/decks/Flirty", { data: { cardId, answer: mine } });
  expect((await r2.json()).revealed).toBe(true);
  for (const p of [a, b]) {
    const v = await (await p.request.get("/api/dark/decks/Flirty")).json();
    const c = v.cards.find((x: Card) => x.id === cardId) as Card;
    expect([c.mine?.answer, c.theirs?.answer].sort()).toEqual([mine, secret].sort());
    // Moved on to the next card, but the answered one is still in the deck.
    expect(v.current).toBe(1);
  }

  // Decks above the agreed tier stay shut.
  expect((await a.request.get("/api/dark/decks/Spicy")).ok()).toBe(false);
});

test("the deck can be flipped back to past cards and any card answered", async ({ couple }) => {
  const { a, b } = couple;
  await ready(a);
  await ready(b);
  const deck = await (await a.request.get("/api/dark/decks/Flirty")).json();
  // Pass the first two cards, so the deck opens on card 3.
  for (const c of deck.cards.slice(0, 2))
    await a.request.post("/api/dark/decks/Flirty", { data: { cardId: c.id, pass: true } });

  expect((await a.request.post("/api/dark/unlock", { data: { pin: "2611" } })).ok()).toBeTruthy();
  await a.goto("/dark/decks/Flirty");
  await expect(a.getByText("3/" + deck.total)).toBeVisible();

  // Back through the deck to card 1, which shows it was passed.
  await a.getByRole("button", { name: "Previous card" }).click();
  await a.getByRole("button", { name: "Previous card" }).click();
  await expect(a.getByText("1/" + deck.total)).toBeVisible();
  await expect(a.getByText("You passed. You can still answer it any time.")).toBeVisible();

  // Jump straight to any card from the strip.
  await a.getByRole("button", { name: /^Card 5,/ }).click();
  await expect(a.getByText("5/" + deck.total)).toBeVisible();

  // Answering focuses the card, then it shows as answered.
  await a.getByRole("button", { name: "Answer this card" }).click();
  const box = a.getByRole("textbox", { name: "Your answer" });
  await expect(box).toBeFocused();
  await box.fill("going back for this one");
  await a.getByRole("button", { name: "Seal my answer" }).click();
  await expect(a.getByText(/reveals when Theo answers/)).toBeVisible();
  await expect(a.locator("span", { hasText: "going back for this one" })).toBeVisible();
  await expect(a.getByRole("button", { name: /^Card 5, answered, sealed/ })).toBeVisible();
});
