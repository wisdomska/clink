import { test, expect } from "./fixtures";

// The earned ask: after the partner's clink lands, offer notifications once; "Not now" waits a week.
test("offers notifications after the first clink, once", async ({ couple }) => {
  const { a, b } = couple;
  // Headless Chromium reports "denied"; a real first visit is "default" (never asked).
  await b.addInitScript(() =>
    Object.defineProperty(Notification, "permission", { get: () => "default" }),
  );
  await b.goto("/us");
  await b.evaluate(() => localStorage.removeItem("clink_push_ask_until"));
  await a.goto("/us");
  await a.getByRole("button", { name: "Send a Clink. Hold to glow together." }).click();
  const ask = b.getByRole("dialog", { name: "Know when Nia clinks?" });
  await expect(ask).toBeVisible({ timeout: 15000 });
  await ask.getByRole("button", { name: "Not now" }).last().click();
  await expect(ask).toBeHidden();
  const until = await b.evaluate(() => Number(localStorage.getItem("clink_push_ask_until")));
  expect(until).toBeGreaterThan(Date.now() + 6 * 24 * 3600 * 1000);
});

// The other moment: opening Clink to clinks that arrived while it was closed.
test("offers notifications on opening to clinks missed while away", async ({ couple }) => {
  const { a, b } = couple;
  await b.addInitScript(() =>
    Object.defineProperty(Notification, "permission", { get: () => "default" }),
  );
  // Nia clinks twice while Theo is away (his device has never been asked).
  await a.goto("/us");
  const send = a.getByRole("button", { name: "Send a Clink. Hold to glow together." });
  await send.click();
  await a.waitForTimeout(3500);
  await send.click();
  await a.waitForTimeout(1000);

  await b.goto("/us");
  const ask = b.getByRole("dialog", { name: /clinks? from Nia while you were away/ });
  await expect(ask).toBeVisible({ timeout: 20000 });
  await ask.getByRole("button", { name: "Not now" }).last().click();
  await expect(ask).toBeHidden();
});
