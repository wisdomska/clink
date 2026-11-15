import sharp from "sharp";
import { test, expect } from "./fixtures";
import { admin } from "./helpers";

const jpeg = (r: number, g: number, b: number) =>
  sharp({ create: { width: 600, height: 600, channels: 3, background: { r, g, b } } })
    .jpeg()
    .toBuffer();

async function startLive(
  a: import("@playwright/test").Page,
  b: import("@playwright/test").Page,
  name: RegExp,
  type: string,
) {
  await a.goto("/play");
  await b.goto("/play");
  await expect(a.getByText("Theo's here. Live games are open.")).toBeVisible({ timeout: 10000 });
  await a.getByRole("button", { name }).first().click();
  await expect(a).toHaveURL(new RegExp(`/play/${type}/`));
  const invite = b.getByText(new RegExp(`Nia invited you to`)).first();
  await expect(invite).toBeVisible({ timeout: 10000 });
  await invite.click();
  await expect(b).toHaveURL(new RegExp(`/play/${type}/`));
}

test.describe("Photo games", () => {
  test("rock paper scissors: sealed throws, first to 3", async ({ couple }) => {
    test.setTimeout(120_000);
    const { a, b } = couple;
    await startLive(a, b, /Rock paper scissors/, "rps");
    for (let i = 0; i < 3; i++) {
      await a.getByRole("button", { name: "Rock", exact: true }).click();
      await expect(a.getByText("Waiting on Theo")).toBeVisible();
      await b.getByRole("button", { name: "Scissors", exact: true }).click();
      await expect(a.getByText("You take it")).toBeVisible();
      await expect(b.getByText("Nia takes it")).toBeVisible();
    }
    await expect(a.getByText(/You win/)).toBeVisible({ timeout: 10000 });
    await expect(b.getByText(/Nia wins/)).toBeVisible();
  });

  test("snap challenge: photos revealed together, votes score", async ({ couple }) => {
    test.setTimeout(150_000);
    const { a, b } = couple;
    await startLive(a, b, /Snap challenge/, "snap");
    for (let i = 0; i < 3; i++) {
      await a.getByTestId("snap-input").setInputFiles({
        name: "a.jpg",
        mimeType: "image/jpeg",
        buffer: await jpeg(230, 138, 245),
      });
      await expect(a.getByText(/Waiting on Theo's photo/)).toBeVisible({ timeout: 20000 });
      // B can't see A's photo yet.
      await expect(b.getByRole("img", { name: "Nia's photo" })).toHaveCount(0);
      await b
        .getByTestId("snap-input")
        .setInputFiles({ name: "b.jpg", mimeType: "image/jpeg", buffer: await jpeg(80, 200, 190) });
      await expect(a.getByRole("img", { name: "Theo's photo" })).toBeVisible({ timeout: 20000 });
      await a.getByRole("button", { name: "Vote for Theo's photo" }).click();
      await b.getByRole("button", { name: "Vote for Nia's photo" }).click();
    }
    await expect(a.getByText(/A draw/)).toBeVisible({ timeout: 15000 });
  });

  test("zoom guess: wrong guess zooms out, right guess scores, roles swap", async ({ couple }) => {
    test.setTimeout(150_000);
    const { a, b } = couple;
    await startLive(a, b, /Zoom guess/, "zoom");
    await a
      .getByTestId("zoom-input")
      .setInputFiles({ name: "mug.jpg", mimeType: "image/jpeg", buffer: await jpeg(200, 120, 60) });
    await a.getByRole("textbox", { name: "What is it?" }).fill("coffee mug");
    await a.getByRole("button", { name: "Send it" }).click();
    await expect(b.getByRole("img", { name: "Close-up to guess" })).toBeVisible({ timeout: 15000 });
    await expect(b.getByText("5 PTS")).toBeVisible();
    await b.getByRole("textbox", { name: "Your guess" }).fill("teapot");
    await b.getByRole("button", { name: "Guess" }).click();
    await expect(b.getByText("4 PTS")).toBeVisible();
    await expect(b.getByText("teapot")).toBeVisible();
    await b.getByRole("textbox", { name: "Your guess" }).fill("Coffee Mugs");
    await b.getByRole("button", { name: "Guess" }).click();
    await expect(b.getByText(/Got it/)).toBeVisible();
    // Theo sets round two.
    await b
      .getByTestId("zoom-input")
      .setInputFiles(
        { name: "sky.jpg", mimeType: "image/jpeg", buffer: await jpeg(108, 184, 255) },
        { timeout: 15000 },
      );
    await b.getByRole("textbox", { name: "What is it?" }).fill("sky");
    await b.getByRole("button", { name: "Send it" }).click();
    await a.getByRole("textbox", { name: "Your guess" }).fill("sky", { timeout: 15000 });
    await a.getByRole("button", { name: "Guess" }).click();
    await expect(a.getByText(/A draw|You win|wins/)).toBeVisible({ timeout: 15000 });
    const { data } = await admin
      .from("games")
      .select("scores, status")
      .eq("type", "zoom")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    expect(data?.status).toBe("finished");
  });

  test("photo memory: flip two, turns pass on a miss, matches score", async ({ couple }) => {
    test.setTimeout(120_000);
    const { a, b } = couple;
    await startLive(a, b, /Photo memory/, "memory");
    // Theo (invited) goes first.
    await expect(b.getByText("Your turn. Flip two.")).toBeVisible({ timeout: 10000 });
    await expect(a.getByText("Theo's turn")).toBeVisible();
    await expect(a.getByRole("button", { name: "Card 1", exact: true })).toBeDisabled();
    const { data: g } = await admin
      .from("games")
      .select("id")
      .eq("type", "memory")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    const { data: sec } = await admin
      .from("game_secrets")
      .select("data")
      .eq("game_id", g!.id)
      .single();
    const layout = (sec!.data as { layout: Array<{ ref: string }> }).layout;
    // A deliberate miss, then the turn passes to Nia.
    const miss = layout.findIndex((c) => c.ref !== layout[0]!.ref);
    await b.getByRole("button", { name: "Card 1", exact: true }).click();
    await expect(b.getByRole("button", { name: "Card 1, face up" })).toBeVisible();
    await b.getByRole("button", { name: `Card ${miss + 1}`, exact: true }).click();
    await expect(a.getByText("Your turn. Flip two.")).toBeVisible({ timeout: 10000 });
    // Nia finds a pair and keeps the turn.
    const j = layout.findIndex((c, k) => k > 0 && c.ref === layout[0]!.ref);
    await a.getByRole("button", { name: "Card 1", exact: true }).click();
    await a.getByRole("button", { name: `Card ${j + 1}`, exact: true }).click();
    await expect(a.getByText("Your turn. Flip two.")).toBeVisible();
    await expect(a.getByText(/you\s*1\s*·/)).toBeVisible();
  });
});
