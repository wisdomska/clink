import { test, expect } from "./fixtures";
import { expectNoHorizontalScroll } from "./no-horizontal-scroll";

test.describe("Play (PLAY-01 to PLAY-08)", () => {
  test("live: invite, join and a full round of How well do you know me", async ({ couple }) => {
    test.setTimeout(120_000); // ten rounds; slower when run against a deployed site
    const { a, b } = couple;
    await a.goto("/play");
    await b.goto("/play");
    await expect(a.getByText("Theo's here. Live games are open.")).toBeVisible({ timeout: 10000 });
    await expectNoHorizontalScroll(a);
    await a
      .getByRole("button", { name: /How well do you know me/ })
      .first()
      .click();
    await expect(a).toHaveURL(/\/play\/know_me\//);
    await expect(b.getByText("Nia invited you to How well do you know me")).toBeVisible({
      timeout: 10000,
    });
    await b.getByText("Nia invited you to How well do you know me").click();
    await expect(b).toHaveURL(/\/play\/know_me\//);
    for (let i = 0; i < 10; i++) {
      await expect(a.getByText(`${String(i + 1).padStart(2, "0")}/10`)).toBeVisible();
      await a.locator("button.press.rounded-full.min-h-14").nth(1).click();
      await b
        .locator("button.press.rounded-full.min-h-14")
        .nth(i < 7 ? 1 : 2)
        .click();
      await a.getByRole("button", { name: "Next" }).click();
      await b.getByRole("button", { name: "Next" }).click();
    }
    await expect(a.getByText("ROUND OVER")).toBeVisible();
    await expect(b.getByText("ROUND OVER")).toBeVisible();
    await expect(b.locator(".mono.text-\\[96px\\]")).toContainText("7");
  });

  test("the server is the referee: out-of-turn moves and peeking are refused", async ({
    couple,
  }) => {
    const { a, b } = couple;
    await a.goto("/play");
    const w = await a.request.post("/api/games", { data: { type: "word" } });
    const { id } = await w.json();
    const outOfTurn = await b.request.post(`/api/games/${id}/move`, {
      data: { move: { pass: true } },
    });
    expect(outOfTurn.status()).toBe(422);
    expect((await outOfTurn.json()).message).toBe("It's their turn.");
    const notOnBoard = await a.request.post(`/api/games/${id}/move`, {
      data: { move: { word: "zzzzzz" } },
    });
    expect(notOnBoard.status()).toBe(422);

    const d = await a.request.post("/api/games", { data: { type: "draw_guess" } });
    const draw = (await d.json()).id;
    await b.request.post(`/api/games/${draw}/join`);
    expect((await a.request.get(`/api/games/${draw}/secret`)).status()).toBe(200);
    expect((await b.request.get(`/api/games/${draw}/secret`)).status()).toBe(403);
    // Trivia answers never reach the client.
    const t = await a.request.post("/api/games", { data: { type: "trivia" } });
    const tid = (await t.json()).id;
    await b.goto(`/play/trivia/${tid}`);
    const leaked = await b.evaluate(async (gid) => {
      const r = await fetch(`/api/games/${gid}/secret`);
      return r.status;
    }, tid);
    expect(leaked).toBe(404);
  });
});
