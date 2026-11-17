import { test, expect } from "./fixtures";

test("unread messages badge the Chat icon, and clear once read", async ({ couple }) => {
  const { a, b } = couple;
  await a.goto("/us");
  await b.goto("/chat");
  for (const m of ["are you up?", "call me"]) {
    await b.getByLabel("Message Nia").fill(m);
    await b.getByRole("button", { name: "Send", exact: true }).click();
  }
  const nav = a.getByRole("navigation", { name: "Main" }).filter({ visible: true }).first();
  const badge = nav.getByRole("status", { name: "2 unread" });
  await expect(badge).toBeVisible({ timeout: 15000 });
  await nav.getByRole("link", { name: /Chat/ }).click();
  await expect(a.getByText("call me")).toBeVisible();
  await a.goto("/us");
  await expect(nav.getByRole("status", { name: /unread/ })).toHaveCount(0, { timeout: 15000 });
});
