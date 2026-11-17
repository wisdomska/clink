import { test, expect } from "./fixtures";

// Opening After Dark mid-call must not end the call: the call lives above both.
test("a call keeps going into After Dark and back", async ({ couple }) => {
  test.setTimeout(120_000);
  const { a, b } = couple;
  expect(
    (await a.request.post("/api/dark/setup", { data: { pin: "2611", tiers: ["Flirty"] } })).ok(),
  ).toBeTruthy();
  await a.request.post("/api/dark/notice");
  expect((await a.request.post("/api/dark/unlock", { data: { pin: "2611" } })).ok()).toBeTruthy();

  await b.goto("/us");
  await a.goto("/chat");
  await a.getByRole("button", { name: "Call", exact: true }).click();
  const incoming = b.getByRole("dialog", { name: "Voice call with Nia" });
  await expect(incoming.getByText("Incoming voice call")).toBeVisible({ timeout: 15000 });
  await incoming.getByRole("button", { name: "Accept" }).click();
  const onA = a.getByRole("dialog", { name: /call with Theo/ });
  await expect(onA.getByText(/^0:0\d$/)).toBeVisible({ timeout: 20000 });

  // Shrink the call, then open After Dark the way you would from the app.
  await onA.getByRole("button", { name: "Minimise call" }).click();
  // In-app navigation, like a tap: to Us, where After Dark opens on every device.
  await a.getByRole("link", { name: "Us", exact: true }).filter({ visible: true }).first().click();
  await expect(a).toHaveURL(/\/us/);
  await a
    .getByRole("link", { name: /After Dark/ })
    .filter({ visible: true })
    .first()
    .click();
  await expect(a).toHaveURL(/\/dark\//, { timeout: 15000 });

  // Still on the call on both sides: the pill shows here, the timer runs there.
  await expect(a.getByRole("status", { name: "On a call with Theo" })).toBeVisible();
  const onB = b.getByRole("dialog", { name: /call with Nia/ });
  await expect(onB.getByText(/^0:\d\d$/)).toBeVisible();
  await a.waitForTimeout(2500);
  await expect(onB.getByText("Call ended.")).toHaveCount(0);
  await expect(a.getByRole("status", { name: "On a call with Theo" })).toBeVisible();

  // And back out of After Dark with Exit, still connected.
  await a.getByRole("button", { name: "Exit" }).click();
  await expect(a).toHaveURL(/\/us/);
  await expect(a.getByRole("status", { name: "On a call with Theo" })).toBeVisible();
  await expect(onB.getByText("Call ended.")).toHaveCount(0);
  await a.getByRole("status", { name: "On a call with Theo" }).getByRole("button").first().click();
  await expect(onA.getByText(/^\d+:\d\d$/)).toBeVisible();
  await onA.getByRole("button", { name: "End" }).click();
});
