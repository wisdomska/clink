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
