import { test, expect } from "./fixtures";
import { admin } from "./helpers";

test("forfeit ends the game, names the winner on both sides, and leads back to the lobby", async ({
  couple,
}) => {
  const { a, b, theo } = couple;
  const r = await a.request.post("/api/games", { data: { type: "word" } });
  expect(r.ok()).toBeTruthy();
  const { id } = await r.json();
  await a.goto(`/play/word/${id}`);

  // A mistaken tap only asks: backing out keeps the game going.
  await a.getByRole("button", { name: "Leave game" }).click();
  await a
    .getByRole("dialog", { name: "Leave the game?" })
    .getByRole("button", { name: "Forfeit, Theo wins" })
    .click();
  const ask = a.getByRole("alertdialog", { name: "Forfeit this game?" });
  await expect(ask.getByText("You can't undo this.", { exact: false })).toBeVisible();
  await ask.getByRole("button", { name: "No, keep playing" }).click();
  await expect(ask).toBeHidden();
  expect((await admin.from("games").select("status").eq("id", id).single()).data?.status).toBe(
    "active",
  );

  // Asked again and confirmed: now it ends.
  await a.getByRole("button", { name: "Leave game" }).click();
  await a
    .getByRole("dialog", { name: "Leave the game?" })
    .getByRole("button", { name: "Forfeit, Theo wins" })
    .click();
  await a
    .getByRole("alertdialog", { name: "Forfeit this game?" })
    .getByRole("button", { name: "Yes, forfeit" })
    .click();

  // Nia sees who won, by name, and that she quit.
  const mine = a.getByRole("region", { name: "Final score" });
  await expect(mine.getByRole("status")).toHaveText("Theo wins!");
  await expect(mine.getByText("You forfeited.")).toBeVisible();
  await expect(mine.getByText("Theo", { exact: true })).toBeVisible();
  await expect(mine.getByText("You", { exact: true })).toBeVisible();
  await expect
    .poll(
      async () =>
        (await admin.from("games").select("status, winner_id").eq("id", id).single()).data,
    )
    .toEqual({ status: "finished", winner_id: theo.id });

  // Theo sees the win, with Nia's name on the forfeit.
  await b.goto(`/play/word/${id}`);
  const theirs = b.getByRole("region", { name: "Final score" });
  await expect(theirs.getByRole("status")).toHaveText("You win!");
  await expect(theirs.getByText("Nia forfeited.")).toBeVisible();

  // A finished game can't be forfeited again, and the lobby is one tap away.
  expect((await a.request.post(`/api/games/${id}/forfeit`)).status()).toBe(409);
  await a.getByRole("button", { name: "Back to the lobby" }).click();
  await expect(a).toHaveURL(/\/play$/);
});
