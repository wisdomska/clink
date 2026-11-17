import { test, expect } from "./fixtures";

test("the games page splits games and history into tabs", async ({ couple }) => {
  const { a } = couple;
  await a.goto("/play");
  const tabs = a.getByRole("tablist", { name: "Play sections" });
  await expect(tabs.getByRole("tab", { name: /Games/ })).toHaveAttribute("aria-selected", "true");
  await expect(a.getByRole("heading", { name: "Play with photos" })).toBeVisible();
  await expect(a.getByRole("heading", { name: "Game history" })).toHaveCount(0);

  await tabs.getByRole("tab", { name: "History" }).click();
  await expect(a).toHaveURL(/tab=history/);
  await expect(a.getByRole("heading", { name: "Game history" })).toBeVisible();
  await expect(a.getByRole("heading", { name: "Play with photos" })).toHaveCount(0);

  // The tab survives a reload.
  await a.reload();
  await expect(a.getByRole("heading", { name: "Game history" })).toBeVisible();
});
