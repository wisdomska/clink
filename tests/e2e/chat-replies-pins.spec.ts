import { randomUUID } from "node:crypto";
import { test, expect } from "./fixtures";
import { admin } from "./helpers";

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

test("reply from the menu, then tap the quote to jump to the original", async ({ couple }) => {
  const { a, b } = couple;
  const original = `pick you up at 7 ${Date.now()}`;
  await b.goto("/chat");
  await b.getByLabel("Message Nia").fill(original);
  await b.getByRole("button", { name: "Send" }).click();

  await a.goto("/chat");
  const bubble = a.getByRole("button", {
    name: new RegExp(`^Theo: ${esc(original)}.*Press for reactions`),
  });
  await expect(bubble).toBeVisible({ timeout: 10000 });
  await bubble.click({ button: "right" });
  await a.getByRole("button", { name: "Reply", exact: true }).click();
  const preview = a.getByTestId("reply-preview");
  await expect(preview).toContainText("Replying to Theo");
  await expect(preview).toContainText(original);
  // The composer is focused, ready to type.
  await expect(a.getByLabel("Message Theo")).toBeFocused();
  await a.keyboard.type("perfect, see you then");
  await a.getByRole("button", { name: "Send", exact: true }).click();
  await expect(preview).toBeHidden();

  // Theo sees the quote inside the reply bubble.
  const quote = b.getByRole("button", { name: /Replying to You: .*Go to message/ });
  await expect(quote).toBeVisible({ timeout: 10000 });
  await expect(quote).toContainText(original);

  // Tapping the quote scrolls to the original and focuses it.
  await a.getByRole("button", { name: /Replying to Theo: .*Go to message/ }).click();
  await expect(bubble).toBeFocused();

  // Escape cancels a reply in progress.
  await bubble.click({ button: "right" });
  await a.getByRole("button", { name: "Reply", exact: true }).click();
  await expect(preview).toBeVisible();
  await a.getByLabel("Message Theo").press("Escape");
  await expect(preview).toBeHidden();
});

test("a reply to an old message still shows its quote", async ({ couple }) => {
  const { a, b, nia, theo } = couple;
  const coupleId = (
    await admin.from("couple_members").select("couple_id").eq("user_id", nia.id).single()
  ).data!.couple_id;
  const old = await admin
    .from("messages")
    .insert({
      couple_id: coupleId,
      sender_id: theo.id,
      client_id: randomUUID(),
      type: "text",
      body: "the very first message",
      sent_at: new Date(Date.now() - 90 * 86400000).toISOString(),
    })
    .select("id")
    .single();
  // Push it well past the first page.
  await admin.from("messages").insert(
    Array.from({ length: 45 }, (_, i) => ({
      couple_id: coupleId,
      sender_id: theo.id,
      client_id: randomUUID(),
      type: "text",
      body: `filler ${i}`,
      sent_at: new Date(Date.now() - (60 - i) * 60000).toISOString(),
    })),
  );
  const r = await a.request.post("/api/messages", {
    data: {
      clientId: randomUUID(),
      type: "text",
      body: "still my favourite",
      replyTo: old.data!.id,
    },
  });
  expect(r.ok()).toBeTruthy();
  await b.goto("/chat");
  const quote = b.getByRole("button", { name: /Replying to You: the very first message/ });
  await expect(quote).toBeVisible({ timeout: 10000 });
  await quote.click();
  await expect(
    b.getByRole("button", { name: /^You: the very first message.*Press for reactions/ }),
  ).toBeFocused({
    timeout: 15000,
  });
});

test("cannot reply to a message from another couple", async ({ couple }) => {
  const { a, nia } = couple;
  const other = await admin.from("couples").insert({}).select("id").single();
  const stray = await admin
    .from("messages")
    .insert({
      couple_id: other.data!.id,
      sender_id: nia.id,
      client_id: randomUUID(),
      type: "text",
      body: "not yours",
    })
    .select("id")
    .single();
  const r = await a.request.post("/api/messages", {
    data: { clientId: randomUUID(), type: "text", body: "hi", replyTo: stray.data!.id },
  });
  expect(r.status()).toBe(422);
});

test("pin a message, jump to it from the pinned bar, then unpin", async ({ couple }) => {
  const { a, b } = couple;
  const text = `flight lands 18:40 gate B ${Date.now()}`;
  await a.goto("/chat");
  await b.goto("/chat");
  await a.getByLabel("Message Theo").fill(text);
  await a.getByRole("button", { name: "Send" }).click();
  const mine = a.getByRole("button", {
    name: new RegExp(`^You: ${esc(text)}.*Press for reactions`),
  });
  await expect(mine).toBeVisible({ timeout: 10000 });
  // Menus open once the message has actually sent.
  await expect(b.getByText(text).first()).toBeVisible({ timeout: 10000 });

  await mine.click({ button: "right" });
  await a.getByRole("button", { name: "Pin", exact: true }).click();
  // Optimistic on Nia's side, live on Theo's.
  await expect(a.getByTestId("pinned-bar")).toContainText(text);
  await expect(b.getByTestId("pinned-bar")).toContainText(text, { timeout: 10000 });

  // The menu now offers Unpin, and the bubble reads as pinned.
  await expect(mine).toHaveAccessibleName(/Pinned\./);

  // Tapping the bar jumps to the message.
  await b.getByRole("button", { name: /Pinned message 1 of 1/ }).click();
  await expect(
    b.getByRole("button", { name: new RegExp(`^Nia: ${esc(text)}.*Press for reactions`) }),
  ).toBeFocused();

  // Unpin from the list on Theo's side; it disappears for Nia too.
  await b.getByRole("button", { name: "All pinned messages" }).click();
  await b.getByRole("button", { name: new RegExp(`Unpin: ${esc(text)}`) }).click();
  await expect(b.getByTestId("pinned-bar")).toBeHidden();
  await expect(a.getByTestId("pinned-bar")).toBeHidden({ timeout: 10000 });
});

test("pins are capped at 10", async ({ couple }) => {
  const { a, nia } = couple;
  const coupleId = (
    await admin.from("couple_members").select("couple_id").eq("user_id", nia.id).single()
  ).data!.couple_id;
  const { data: rows } = await admin
    .from("messages")
    .insert(
      Array.from({ length: 11 }, (_, i) => ({
        couple_id: coupleId,
        sender_id: nia.id,
        client_id: randomUUID(),
        type: "text",
        body: `pin me ${i}`,
      })),
    )
    .select("id");
  for (const m of rows!.slice(0, 10)) {
    expect((await a.request.post(`/api/messages/${m.id}/pin`)).ok()).toBeTruthy();
  }
  const over = await a.request.post(`/api/messages/${rows![10]!.id}/pin`);
  expect(over.status()).toBe(409);
  await a.goto("/chat");
  await expect(a.getByRole("button", { name: /Pinned message 1 of 10/ })).toBeVisible({
    timeout: 10000,
  });
});

test("reply by hovering (mouse) or by swiping a message to the right (touch)", async ({
  couple,
}, info) => {
  const { a, b } = couple;
  const original = `swipe me ${Date.now()}`;
  await b.goto("/chat");
  await b.getByLabel("Message Nia").fill(original);
  await b.getByRole("button", { name: "Send" }).click();
  await a.goto("/chat");
  const bubble = a.getByRole("button", {
    name: new RegExp(`^Theo: ${esc(original)}.*Press for reactions`),
  });
  await expect(bubble).toBeVisible({ timeout: 10000 });
  const preview = a.getByTestId("reply-preview");

  if (info.project.name === "desktop") {
    // A mouse: hovering shows a reply button beside the message.
    const reply = a.getByRole("button", { name: "Reply to Theo's message" }).last();
    await bubble.hover();
    await expect(reply).toBeVisible();
    await reply.click();
    await expect(preview).toContainText(original);
    await a.getByRole("button", { name: "Cancel reply" }).click();
    await expect(preview).toBeHidden();
  } else {
    // Touch devices: no hover button, ever.
    await expect(a.getByRole("button", { name: "Reply to Theo's message" }).last()).toBeHidden();
  }

  // Drag it right past the threshold: reply mode.
  const box = (await bubble.boundingBox())!;
  const y = box.y + box.height / 2;
  await a.mouse.move(box.x + 20, y);
  await a.mouse.down();
  for (let dx = 10; dx <= 110; dx += 10) await a.mouse.move(box.x + 20 + dx, y + 2);
  await a.mouse.up();
  await expect(preview).toContainText("Replying to Theo");
  await expect(preview).toContainText(original);

  // A short drag doesn't.
  await a.getByRole("button", { name: "Cancel reply" }).click();
  await a.mouse.move(box.x + 20, y);
  await a.mouse.down();
  await a.mouse.move(box.x + 50, y);
  await a.mouse.up();
  await expect(preview).toBeHidden();
});
