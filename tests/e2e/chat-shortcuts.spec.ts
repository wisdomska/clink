import { test, expect } from "./fixtures";

test("keyboard: Up edits your last message, Esc backs out of an edit or a reply", async ({
  couple,
}) => {
  const { a } = couple;
  await a.goto("/chat");
  const box = a.getByRole("textbox", { name: "Message Theo" });
  await box.fill("dinner at 7?");
  await box.press("Control+Enter");
  await expect(a.getByText("dinner at 7?")).toBeVisible();
  await expect(box).toHaveValue("");

  // Up in the empty box: the last message comes back to edit, caret at the end.
  // (A message still sending can't be edited yet: wait until it's sent.)
  await expect(async () => {
    await box.press("ArrowUp");
    await expect(a.getByText("Editing message")).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: 15000 });
  await expect(box).toHaveValue("dinner at 7?");
  await box.press("Backspace");
  await box.pressSequentially(", or 8");
  await box.press("Control+Enter");
  await expect(a.getByText("dinner at 7, or 8")).toBeVisible();
  await expect(a.getByText("Editing message")).toHaveCount(0);

  // Up with something typed is just a cursor move.
  await box.fill("draft");
  await box.press("ArrowUp");
  await expect(a.getByText("Editing message")).toHaveCount(0);
  await box.fill("");

  // Esc cancels an edit...
  await box.press("ArrowUp");
  await expect(a.getByText("Editing message")).toBeVisible();
  await box.press("Escape");
  await expect(a.getByText("Editing message")).toHaveCount(0);
  await expect(box).toHaveValue("");

  // ...and a reply.
  await a.getByRole("button", { name: /^You: dinner at 7, or 8/ }).hover();
  const reply = a.getByRole("button", { name: "Reply to your message" });
  if (await reply.isVisible()) await reply.click();
  else {
    await a.getByRole("button", { name: /^You: dinner at 7, or 8/ }).click({ delay: 600 });
    await a.getByRole("button", { name: "Reply", exact: true }).click();
  }
  await expect(a.getByTestId("reply-preview")).toBeVisible();
  await expect(box).toBeFocused();
  await box.press("Escape");
  await expect(a.getByTestId("reply-preview")).toHaveCount(0);
});
