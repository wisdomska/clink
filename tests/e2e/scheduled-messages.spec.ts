import { randomUUID } from "node:crypto";
import { test, expect } from "./fixtures";
import { admin } from "./helpers";

test("schedule a message from the composer, then cancel it", async ({ couple }) => {
  const { a, b } = couple;
  const text = `good morning love ${Date.now()}`;
  await a.goto("/chat");
  await a.getByLabel("Message Theo").fill(text);
  await a.getByRole("button", { name: "Schedule a message" }).click();
  const sheet = a.getByRole("dialog", { name: "Send later" });
  await expect(sheet).toContainText(text);
  await sheet.getByRole("button", { name: /Tomorrow, 08:00/ }).click();
  await expect(sheet).toBeHidden();
  await expect(a.getByLabel("Message Theo")).toHaveValue("");
  await expect(a.getByRole("button", { name: "1 message scheduled" })).toBeVisible();

  // Theo can't see it, not even through the API.
  // The screen updates before the save lands; wait for the database.
  await expect
    .poll(
      async () =>
        (await admin.from("scheduled_messages").select("id, body").eq("body", text)).data?.length,
      { timeout: 15000 },
    )
    .toBe(1);
  const { data: rows } = await admin.from("scheduled_messages").select("id, body").eq("body", text);
  await b.goto("/chat");
  await expect(b.getByText(text)).toHaveCount(0);

  // Cancel: it's gone from the queue and back in the composer.
  await a.getByRole("button", { name: "1 message scheduled" }).click();
  await a.getByRole("button", { name: new RegExp(`Cancel scheduled message: ${text}`) }).click();
  await expect(a.getByRole("button", { name: "1 message scheduled" })).toBeHidden();
  await expect(a.getByLabel("Message Theo")).toHaveValue(text);
  const { data: after } = await admin
    .from("scheduled_messages")
    .select("status")
    .eq("id", rows![0]!.id)
    .single();
  expect(after!.status).toBe("cancelled");
});

test("the server refuses bad times and the cron route delivers due messages once", async ({
  couple,
}) => {
  const { a, b, nia } = couple;
  const soon = await a.request.post("/api/messages/scheduled", {
    data: { clientId: randomUUID(), body: "too soon", sendAt: new Date().toISOString() },
  });
  expect(soon.status()).toBe(422);
  const empty = await a.request.post("/api/messages/scheduled", {
    data: {
      clientId: randomUUID(),
      body: "   ",
      sendAt: new Date(Date.now() + 3600000).toISOString(),
    },
  });
  expect(empty.status()).toBe(422);

  const made = await a.request.post("/api/messages/scheduled", {
    data: {
      clientId: randomUUID(),
      body: "surprise at noon",
      sendAt: new Date(Date.now() + 3600000).toISOString(),
    },
  });
  expect(made.status()).toBe(201);
  const { scheduled } = await made.json();
  // Theo cannot cancel Nia's message.
  expect((await b.request.delete(`/api/messages/scheduled/${scheduled.id}`)).ok()).toBeFalsy();

  // Pretend it's due, then run the delivery route twice.
  await admin
    .from("scheduled_messages")
    .update({ send_at: new Date(Date.now() - 1000).toISOString() })
    .eq("id", scheduled.id);
  expect((await a.request.post("/api/messages/scheduled/run")).status()).toBe(403);
  for (let i = 0; i < 2; i++) {
    const run = await a.request.post("/api/messages/scheduled/run", {
      headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
    });
    expect(run.status()).toBe(200);
  }
  const { data: sent } = await admin
    .from("messages")
    .select("id")
    .eq("sender_id", nia.id)
    .eq("body", "surprise at noon");
  expect(sent).toHaveLength(1);
  // Too late to cancel now.
  expect((await a.request.delete(`/api/messages/scheduled/${scheduled.id}`)).status()).toBe(409);
  await b.goto("/chat");
  await expect(b.getByText("surprise at noon")).toBeVisible({ timeout: 10000 });
});
