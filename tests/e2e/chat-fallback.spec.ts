import { test, expect } from "./fixtures";

// When live updates can't connect (a strict network, a flaky proxy), chat
// falls back to checking every few seconds, so messages still arrive.
test("messages still arrive when the live connection is blocked", async ({ couple }) => {
  test.setTimeout(90_000);
  const { a, b } = couple;
  await b.routeWebSocket(/\/realtime\/v1\/websocket/, (ws) => ws.close());
  await b.goto("/chat");
  await a.goto("/chat");
  await a.getByLabel("Message Theo").fill("can you hear me now?");
  await a.getByRole("button", { name: "Send" }).click();
  await expect(b.getByText("can you hear me now?")).toBeVisible({ timeout: 20000 });
  expect(await b.evaluate(() => document.documentElement.dataset.chatLive)).not.toBe("true");
});
