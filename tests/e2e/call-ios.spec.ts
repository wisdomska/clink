import { test, expect } from "./fixtures";

// iOS pauses web apps in the background. Pretend to be an iPhone and step
// away mid-call: the other side waits, and the call carries on when we're back.
test("on iPhone, stepping away mid-call holds the call until you're back", async ({ couple }) => {
  test.setTimeout(90_000);
  const { a, b } = couple;
  await a.addInitScript(() => {
    Object.defineProperty(navigator, "userAgent", {
      get: () =>
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
    });
    const w = window as unknown as { __hidden: boolean };
    w.__hidden = false;
    Object.defineProperty(document, "visibilityState", {
      get: () => (w.__hidden ? "hidden" : "visible"),
    });
  });
  const setHidden = (hidden: boolean) =>
    a.evaluate((h) => {
      (window as unknown as { __hidden: boolean }).__hidden = h;
      document.dispatchEvent(new Event("visibilitychange"));
    }, hidden);

  await b.goto("/us");
  await a.goto("/chat");
  await a.getByRole("button", { name: "Call", exact: true }).click();
  await b
    .getByRole("dialog", { name: "Voice call with Nia" })
    .getByRole("button", { name: "Accept" })
    .click();
  const onA = a.getByRole("dialog", { name: /call with Theo/ });
  const onB = b.getByRole("dialog", { name: /call with Nia/ });
  await expect(onA.getByText(/^0:0\d$/)).toBeVisible({ timeout: 20000 });

  // The tip shows once, and stays dismissed.
  const tip = onA.getByRole("note");
  await expect(tip).toContainText("Keep Clink open during calls on iPhone");
  await tip.getByRole("button", { name: "Got it" }).click();
  await expect(onA.getByRole("note")).toHaveCount(0);

  // Away: Theo's side holds the call.
  await setHidden(true);
  await expect(onB.getByText(/Reconnecting/)).toBeVisible({ timeout: 10000 });
  await a.waitForTimeout(3000);
  await expect(onB.getByText(/Call ended/)).toHaveCount(0);

  // Back: it carries on.
  await setHidden(false);
  await expect(onB.getByText(/Reconnecting/)).toHaveCount(0, { timeout: 15000 });
  await expect(onA.getByText(/^0:\d\d$/)).toBeVisible();
  await expect(onB.getByText(/^0:\d\d$/)).toBeVisible();
  await onB.getByRole("button", { name: "End" }).click();
});
