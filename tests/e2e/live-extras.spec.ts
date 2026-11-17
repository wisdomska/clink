import { test, expect } from "./fixtures";

// Live rooms: a 3-2-1 countdown when the game starts, and reactions that float on both screens.
test("countdown on start and live reactions", async ({ couple }) => {
  const { a, b } = couple;
  const id = (await (await a.request.post("/api/games", { data: { type: "trivia" } })).json())
    .id as string;
  await a.goto(`/play/trivia/${id}`);
  await expect(a.getByText(/Waiting on Theo/)).toBeVisible();
  await b.request.post(`/api/games/${id}/join`);
  // A's screen sees the game go live and counts down.
  await expect(a.getByRole("status").filter({ hasText: /^(3|2|1|Go)$/ })).toBeVisible({
    timeout: 10000,
  });

  await b.goto(`/play/trivia/${id}`);
  await expect(a.getByRole("group", { name: "Send a reaction" })).toBeVisible();
  await expect(b.getByRole("group", { name: "Send a reaction" })).toBeVisible();
  // Reactions are fire-and-forget; retry until Theo's live connection has joined.
  const bubble = b.locator("span.text-\\[36px\\]", { hasText: "🔥" });
  await expect(async () => {
    await a.getByRole("button", { name: "React 🔥" }).click();
    await expect(bubble).toBeVisible({ timeout: 1400 });
  }).toPass({ timeout: 15000 });
});
