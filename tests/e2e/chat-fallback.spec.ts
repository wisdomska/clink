import { test, expect } from "./fixtures";

// When live updates can't connect (a strict network, a flaky proxy), chat
// falls back to checking every few seconds, so messages still arrive.
test("messages still arrive when the live connection is blocked", async ({ couple }) => {
  test.setTimeout(90_000);
  const { a, b } = couple;
  await b.routeWebSocket(/\/realtime\/v1\/websocket/, (ws) => ws.close());
  await b.goto("/chat");
  await a.goto("/chat");
  await a.getByLabel("Message Theo").first().fill("can you hear me now?");
  await a.getByRole("button", { name: "Send" }).first().click();
  await expect(b.getByText("can you hear me now?")).toBeVisible({ timeout: 20000 });
  expect(await b.evaluate(() => document.documentElement.dataset.chatLive)).not.toBe("true");
});

// Connected, but the event for a new message never arrives: the quiet check
// every 15 s still brings it in.
test("a message whose live event was dropped still arrives", async ({ couple }) => {
  test.setTimeout(90_000);
  const { a, b } = couple;
  await b.routeWebSocket(/\/realtime\/v1\/websocket/, (ws) => {
    const server = ws.connectToServer();
    server.onMessage((m) => {
      if (typeof m === "string" && m.includes("postgres_changes") && m.includes('"INSERT"')) return;
      ws.send(m);
    });
  });
  await b.goto("/chat");
  await expect
    .poll(() => b.evaluate(() => document.documentElement.dataset.chatLive), { timeout: 20000 })
    .toBe("true");
  await a.goto("/chat");
  await a.getByLabel("Message Theo").first().fill("did that one get lost?");
  await a.getByRole("button", { name: "Send" }).first().click();
  await expect(b.getByText("did that one get lost?")).toBeVisible({ timeout: 25000 });
});
