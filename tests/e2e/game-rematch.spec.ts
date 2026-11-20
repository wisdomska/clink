import { test, expect } from "./fixtures";

// After a game, the partner who's still looking at the result hears about a
// rematch and can join in one tap.
test("a rematch shows up for the partner with a Join button", async ({ couple }) => {
  const { a, b } = couple;
  const r = await a.request.post("/api/games", { data: { type: "word" } });
  const { id } = await r.json();
  // Nia forfeits to finish it quickly.
  expect((await a.request.post(`/api/games/${id}/forfeit`)).ok()).toBeTruthy();

  await a.goto(`/play/word/${id}`);
  await b.goto(`/play/word/${id}`);
  await expect(b.getByRole("region", { name: "Final score" })).toBeVisible({ timeout: 15000 });
  await expect(b.getByText(/started a rematch/)).toHaveCount(0);

  await a.getByRole("button", { name: "New board" }).click();
  await expect.poll(() => a.url()).not.toContain(id);
  const bar = b.getByRole("status").filter({ hasText: "Nia started a rematch." });
  await expect(bar).toBeVisible({ timeout: 15000 });
  await bar.getByRole("button", { name: "Join" }).click();
  await expect(b).not.toHaveURL(new RegExp(id));
  await expect(b).toHaveURL(/\/play\/word\//);
});
