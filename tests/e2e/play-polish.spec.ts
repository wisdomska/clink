import { test, expect } from "./fixtures";

test.describe("Play polish", () => {
  test("swipe a Would You Rather card to pick", async ({ couple }, info) => {
    test.skip(info.project.name !== "mobile", "Swipe card shows on phones");
    const { a, b } = couple;
    const id = (await (await a.request.post("/api/games", { data: { type: "wyr" } })).json())
      .id as string;
    await b.request.post(`/api/games/${id}/join`);
    await a.goto(`/play/wyr/${id}`);
    const card = a.getByText("Swipe left or right");
    await expect(card).toBeVisible();
    const box = (await card.boundingBox())!;
    await a.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await a.mouse.down();
    await a.mouse.move(box.x + box.width / 2 + 180, box.y + box.height / 2, { steps: 8 });
    await a.mouse.up();
    await expect(a.getByText(/Picked\. Waiting on Theo\./)).toBeVisible();
  });

  test("leaving a live round asks first", async ({ couple }) => {
    const { a, b } = couple;
    const id = (await (await a.request.post("/api/games", { data: { type: "trivia" } })).json())
      .id as string;
    await b.request.post(`/api/games/${id}/join`);
    await a.goto(`/play/trivia/${id}`);
    await a.getByRole("button", { name: "Leave game" }).click();
    await expect(a.getByRole("dialog", { name: "Leave the game?" })).toBeVisible();
    // Forfeit is offered too, naming who would win.
    await expect(a.getByRole("button", { name: "Forfeit, Theo wins" })).toBeVisible();
    await a.getByRole("button", { name: "Keep playing" }).click();
    await expect(a).toHaveURL(new RegExp(`/play/trivia/${id}`));
    await a.getByRole("button", { name: "Leave game" }).click();
    await a.getByRole("button", { name: "Leave for now" }).click();
    await expect(a).toHaveURL(/\/play$/);
  });
});
