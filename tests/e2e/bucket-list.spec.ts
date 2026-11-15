import { test, expect } from "./fixtures";

test("our list: add together, tick off, live for both", async ({ couple }) => {
  const { a, b } = couple;
  await a.goto("/plans/list");
  await b.goto("/plans/list");
  await a.getByRole("radio", { name: /Go/ }).click();
  await a.getByRole("textbox", { name: "Add to our list" }).fill("Lisbon in spring");
  await a.getByRole("button", { name: "Add" }).click();
  await expect(b.getByText("Lisbon in spring")).toBeVisible({ timeout: 10000 });
  await expect(b.getByText("Added by Nia")).toBeVisible();
  await b.getByRole("button", { name: "Done: Lisbon in spring" }).click();
  await expect(
    a.getByRole("region", { name: "Done together" }).getByText("Lisbon in spring"),
  ).toBeVisible({
    timeout: 10000,
  });
});
