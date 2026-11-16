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
  const box = b.getByRole("checkbox", { name: "Lisbon in spring" });
  await expect(box).toHaveAttribute("aria-checked", "false");
  await box.click();
  // Optimistic: it moves to Done straight away on the device that ticked it.
  await expect(
    b
      .getByRole("region", { name: "Done together" })
      .getByRole("checkbox", { name: "Lisbon in spring" }),
  ).toHaveAttribute("aria-checked", "true");
  await expect(
    a.getByRole("region", { name: "Done together" }).getByText("Lisbon in spring"),
  ).toBeVisible({
    timeout: 10000,
  });
  // Untick: back to the to-do list for both.
  await a
    .getByRole("region", { name: "Done together" })
    .getByRole("checkbox", { name: "Lisbon in spring" })
    .click();
  await expect(b.getByRole("list", { name: "To do" }).getByText("Lisbon in spring")).toBeVisible({
    timeout: 10000,
  });
});
