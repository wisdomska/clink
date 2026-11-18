import { test, expect } from "./fixtures";

test("gesture tips show one at a time and stay dismissed", async ({ couple }) => {
  const { a } = couple;
  await a.goto("/us");
  const tip = a.getByRole("note", { name: "Tip" });
  await expect(tip).toContainText("Press and hold the Clink button");
  await tip.getByRole("button", { name: "Got it" }).click();
  await expect(tip).toContainText("Press and hold your partner's picture");
  await tip.getByRole("button", { name: "Got it" }).click();
  await expect(tip).toHaveCount(0);
  await a.reload();
  await expect(a.getByRole("note", { name: "Tip" })).toHaveCount(0);
});
