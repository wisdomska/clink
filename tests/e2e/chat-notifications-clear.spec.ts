import { test, expect } from "./fixtures";

// Full Chromium: the lighter headless shell can't show notifications.
test.use({ channel: "chromium" });

// Stacked chat notifications ("3 new messages from Theo") go away, and their
// count starts over, once the chat is opened. (The stacking itself is unit-tested.)
test("opening the chat clears its notifications", async ({ couple, browserName }) => {
  test.skip(browserName !== "chromium", "Notifications in headless Chromium only");
  const { a } = couple;
  await a.goto("/us");
  await a.context().grantPermissions(["notifications"], { origin: new URL(a.url()).origin });
  const can = await a.evaluate(() => Notification.permission === "granted");
  test.skip(!can, "This browser build can't show notifications");
  const count = () =>
    a.evaluate(async () => {
      const r = await navigator.serviceWorker.ready;
      return (await r.getNotifications({ tag: "chat" })).length;
    });
  await a.evaluate(async () => {
    const r = await navigator.serviceWorker.ready;
    await r.showNotification("Clink", {
      body: "2 new messages from Theo\nsee you at 8",
      tag: "chat",
      data: { type: "message", count: 2 },
    });
  });
  await expect.poll(count, { timeout: 15000 }).toBe(1);
  await a.goto("/chat");
  await expect.poll(count, { timeout: 15000 }).toBe(0);
});
