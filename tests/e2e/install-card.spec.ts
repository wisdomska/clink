import { test, expect } from "./fixtures";

test("Settings offers adding Clink to the home screen, with a guide where there's no install prompt", async ({
  couple,
}) => {
  const { a } = couple;
  await a.goto("/settings?tab=look");
  const card = a.getByRole("region", { name: "Add Clink to your home screen" });
  await expect(card).toBeVisible();
  await card.getByRole("link", { name: /How to/ }).click();
  await expect(a).toHaveURL(/\/install/);
  await expect(a.getByRole("heading", { name: "Put Clink on your home screen" })).toBeVisible();
});
