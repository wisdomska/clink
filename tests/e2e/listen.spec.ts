import { test, expect } from "./fixtures";

// TOG-02: one shared queue; either partner adds; both see it live.
test("listen together: both partners share one queue", async ({ couple }) => {
  const { a, b } = couple;
  await a.goto("/plans/listen");
  await b.goto("/plans/listen");
  await expect(b.getByText(/The queue is empty/)).toBeVisible();

  await a.getByLabel("Music link").fill("https://youtu.be/dQw4w9WgXcQ");
  await a.getByRole("button", { name: "Add to queue" }).click();
  await expect(b.getByText(/Now playing:/)).toBeVisible({ timeout: 10000 });

  await b.getByLabel("Music link").fill("https://www.youtube.com/watch?v=9bZkp7q19f0");
  await b.getByRole("button", { name: "Add to queue" }).click();
  await expect(a.getByRole("button", { name: "Remove from queue" })).toHaveCount(1, {
    timeout: 10000,
  });

  // Spotify links are accepted too, and show the Spotify embed for both once it is up.
  await a.getByLabel("Music link").fill("https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT");
  await a.getByRole("button", { name: "Add to queue" }).click();
  await expect(b.getByRole("button", { name: "Remove from queue" })).toHaveCount(2, {
    timeout: 10000,
  });

  // Not a supported link: refused with clear copy.
  await a.getByLabel("Music link").fill("https://example.com/song.mp3");
  await a.getByRole("button", { name: "Add to queue" }).click();
  await expect(
    a.getByText("That link isn't one we can play. Paste a YouTube, Spotify or Apple Music link."),
  ).toBeVisible();
});

// Spotify tracks are synced through the Spotify iFrame API. CI can't reach Spotify, so this
// only checks our own UI (the note, the Next button and auto-advance by hand), not the embed.
test("listen together: a Spotify track shows the sync note and can be skipped", async ({
  couple,
}) => {
  const { a, b } = couple;
  // Keep the test independent of Spotify's network: the player falls back to the plain embed.
  for (const p of [a, b]) {
    await p.route(/open\.spotify\.com\//, (r) => r.abort());
  }
  await a.goto("/plans/listen");
  await b.goto("/plans/listen");

  await a.getByLabel("Music link").fill("https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT");
  await a.getByRole("button", { name: "Add to queue" }).click();
  for (const p of [a, b]) {
    await expect(p.getByText(/stay in step on both devices/)).toBeVisible({ timeout: 10000 });
    await expect(p.getByText(/30-second preview/)).toBeVisible();
  }

  await a
    .getByLabel("Music link")
    .fill("https://music.apple.com/us/song/blinding-lights/1488408568");
  await a.getByRole("button", { name: "Add to queue" }).click();
  await expect(b.getByRole("button", { name: "Remove from queue" })).toHaveCount(1, {
    timeout: 10000,
  });

  await b.getByRole("button", { name: "Next" }).click();
  for (const p of [a, b]) {
    await expect(p.getByText(/Apple Music can't be synced/)).toBeVisible({ timeout: 10000 });
  }
});

// Regression: the YouTube player was used before it was ready (it only gets
// its methods then), throwing "getCurrentTime is not a function" every second.
test("listen together: a player that isn't ready yet throws nothing", async ({ couple }) => {
  const { a, b } = couple;
  // YouTube loads but never reports ready: the window where it used to crash.
  for (const p of [a, b])
    await p.addInitScript(() => {
      (window as unknown as { YT: unknown }).YT = {
        Player: function () {
          return { destroy() {} };
        },
        PlayerState: { ENDED: 0, PLAYING: 1, PAUSED: 2 },
      };
    });
  const errors: string[] = [];
  for (const p of [a, b]) p.on("pageerror", (e) => errors.push(e.message));
  await a.goto("/plans/listen");
  await b.goto("/plans/listen");
  await a.getByLabel("Music link").fill("https://youtu.be/dQw4w9WgXcQ");
  await a.getByRole("button", { name: "Add to queue" }).click();
  for (const p of [a, b]) await expect(p.getByText(/Now playing:/)).toBeVisible({ timeout: 10000 });
  // Both rooms tick and talk to each other for a few seconds.
  await a.waitForTimeout(4000);
  await a.getByRole("button", { name: "Play", exact: true }).click();
  await expect(a.getByText("The player is still loading.")).toBeVisible();
  expect(errors).toEqual([]);
});
