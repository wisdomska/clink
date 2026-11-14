import { test, expect } from "./fixtures";

// TOG-02: one shared queue; either partner adds; both see it live.
test("listen together: both partners share one queue", async ({ couple }) => {
  const { a, b } = couple;
  await a.goto("/plans/listen");
  await b.goto("/plans/listen");
  await expect(b.getByText(/The queue is empty/)).toBeVisible();

  await a.getByLabel("YouTube link").fill("https://youtu.be/dQw4w9WgXcQ");
  await a.getByRole("button", { name: "Add to queue" }).click();
  await expect(b.getByText(/Now playing:/)).toBeVisible({ timeout: 10000 });

  await b.getByLabel("YouTube link").fill("https://www.youtube.com/watch?v=9bZkp7q19f0");
  await b.getByRole("button", { name: "Add to queue" }).click();
  await expect(a.getByRole("button", { name: "Remove from queue" })).toHaveCount(1, {
    timeout: 10000,
  });

  // Not a YouTube link: refused by the server.
  await a.getByLabel("YouTube link").fill("https://example.com/song.mp3");
  await a.getByRole("button", { name: "Add to queue" }).click();
  await expect(a.getByText("Paste a YouTube link.")).toBeVisible();
});
