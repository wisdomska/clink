import { test, expect } from "./fixtures";
import { admin } from "./helpers";

// Regression: a word played early in a long game was refused as "already
// played" while the history only listed the last 12 plays. Every play shows now.
test("the word history lists every play, and a refusal names the turn", async ({ couple }) => {
  const { a, nia, theo } = couple;
  const r = await a.request.post("/api/games", { data: { type: "word" } });
  expect(r.ok()).toBeTruthy();
  const { id } = await r.json();

  const board = ["P", "O", "O", "R", "X", "X", "X", "X", "X", "X", "X", "X", "X", "X", "X", "X"];
  const words = ["roo", "poor", ...Array.from({ length: 13 }, () => null)];
  const at = new Date().toISOString();
  const plays = words.map((word, i) => ({
    by: i % 2 === 0 ? nia.id : theo.id,
    word,
    points: word ? word.length - 2 : 0,
    at,
  }));
  const { data: g } = await admin.from("games").select("state").eq("id", id).single();
  const state = {
    ...(g!.state as object),
    board,
    plays,
    turn: theo.id,
    scores: { [nia.id]: 1, [theo.id]: 2 },
  };
  await admin.from("games").update({ state }).eq("id", id);

  await couple.b.goto(`/play/word/${id}`);
  const list = couple.b.getByRole("list", { name: "Words played" });
  await expect(list.getByRole("listitem")).toHaveCount(15);
  await expect(list.getByText("POOR", { exact: true })).toBeVisible();

  // Tapping a played word shows where it ran on the board, letter by letter.
  const row = list.getByRole("button", { name: /^Turn 2, you: POOR/ });
  await row.click();
  await expect(row).toHaveAttribute("aria-pressed", "true");
  const grid = couple.b.getByRole("grid", { name: "Letter board" });
  for (const [n, t] of [
    [1, "P"],
    [2, "O"],
    [3, "O"],
    [4, "R"],
  ] as const)
    await expect(grid.getByRole("button", { name: `${t}, letter ${n} of POOR` })).toBeVisible();
  // The board comes back into view to show it.
  await expect(grid.getByRole("button", { name: "P, letter 1 of POOR" })).toBeInViewport();
  await row.click();
  await expect(grid.getByRole("button", { name: /of POOR/ })).toHaveCount(0);

  // Trace P-O-O-R and play it: refused, and the message says where it was played.
  for (const n of [1, 2, 3, 4]) {
    await couple.b
      .getByRole("grid", { name: "Letter board" })
      .getByRole("button")
      .nth(n - 1)
      .click();
  }
  await couple.b.getByRole("button", { name: "Play POOR" }).click();
  await expect(couple.b.getByText("POOR was played on turn 2, by you.")).toBeVisible();
});
