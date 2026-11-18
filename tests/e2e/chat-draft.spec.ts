import { test, expect } from "./fixtures";

test("a half-written message survives a reload, and sending clears it", async ({ couple }) => {
  const { a } = couple;
  await a.goto("/chat");
  const box = a.getByRole("textbox", { name: "Message Theo" });
  await box.fill("don't forget the plantain");
  await a.waitForTimeout(500);
  await a.reload();
  await expect(a.getByRole("textbox", { name: "Message Theo" })).toHaveValue(
    "don't forget the plantain",
  );
  await a.getByRole("textbox", { name: "Message Theo" }).press("Control+Enter");
  await expect(a.getByText("don't forget the plantain").last()).toBeVisible();
  await expect(a.getByRole("textbox", { name: "Message Theo" })).toHaveValue("");
  await a.waitForTimeout(500);
  await a.reload();
  await expect(a.getByRole("textbox", { name: "Message Theo" })).toHaveValue("");
});
