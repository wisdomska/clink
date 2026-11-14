import { test, expect } from "./fixtures";

// Prototype "Invite pending": a game invite reaches your partner anywhere in the app.
test("game invite shows app-wide and joins the room", async ({ couple }) => {
  const { a, b } = couple;
  await b.goto("/keep");
  await a.goto("/play");
  await expect(a.getByText("Theo's here. Live games are open.")).toBeVisible({ timeout: 10000 });
  await a
    .getByRole("button", { name: /How well do you know me/ })
    .first()
    .click();
  await expect(a).toHaveURL(/\/play\/know_me\//);

  const invite = b.getByRole("alertdialog", { name: "Nia wants to play" });
  await expect(invite).toBeVisible({ timeout: 10000 });
  await expect(invite).toContainText("How well do you know me");
  await invite.getByRole("button", { name: "Join" }).click();
  await expect(b).toHaveURL(/\/play\/know_me\//);
});
