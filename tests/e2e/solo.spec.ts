import { test, expect } from "./fixtures";

// Not linked yet is not a dead end: the app opens in solo mode.
test("before linking you can use the app, and partner-only screens ask you to link", async ({
  couple,
}) => {
  const { a } = couple;
  const { token } = await (
    await a.request.post("/api/couple/unlink", { data: { step: "start" } })
  ).json();
  expect(
    (await a.request.post("/api/couple/unlink", { data: { step: "confirm", token } })).ok(),
  ).toBeTruthy();

  // The link page lets you skip.
  await a.goto("/link");
  await a.getByRole("button", { name: "Skip for now" }).click();
  await expect(a).toHaveURL(/\/us$/);
  await expect(a.getByRole("heading", { name: "Link with your partner" })).toBeVisible();

  // Partner-only tabs explain and offer the invite instead of redirecting.
  await a.goto("/chat");
  await expect(a.getByRole("heading", { name: "Chat opens once you link" })).toBeVisible();
  await expect(a.getByRole("link", { name: "Share my code" })).toHaveAttribute("href", "/link");
  await a.goto("/play");
  await expect(a.getByRole("heading", { name: "Play opens once you link" })).toBeVisible();

  // Settings work, with a way to link and no unlink.
  await a.goto("/settings?tab=account");
  await expect(a.getByRole("link", { name: /Link with your partner/ })).toBeVisible();
  await expect(a.getByText(/^Unlink from/)).toHaveCount(0);
  await a.goto("/settings?tab=look");
  await expect(a.getByRole("region", { name: "Add Clink to your home screen" })).toBeVisible();
});
