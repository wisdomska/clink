import { randomUUID } from "node:crypto";
import type { Page } from "@playwright/test";
import { test, expect } from "./fixtures";
import { admin } from "./helpers";

const listOf = (p: Page) => p.locator("[aria-live=polite].overflow-y-auto").first();
const atBottom = (p: Page) =>
  listOf(p).evaluate((el) => el.scrollHeight - el.scrollTop - el.clientHeight < 80);

test("chat opens at the newest message, or at the first unread one with a divider", async ({
  couple,
}) => {
  test.setTimeout(120_000);
  const { a, nia, theo } = couple;
  const coupleId = (
    await admin.from("couple_members").select("couple_id").eq("user_id", nia.id).single()
  ).data!.couple_id as string;
  // A long, fully read conversation.
  const t0 = Date.now() - 2 * 86_400_000;
  const read = new Date().toISOString();
  const { error } = await admin.from("messages").insert(
    Array.from({ length: 60 }, (_, i) => ({
      couple_id: coupleId,
      sender_id: i % 2 ? nia.id : theo.id,
      client_id: randomUUID(),
      type: "text",
      body: `old line ${String(i).padStart(2, "0")}`,
      sent_at: new Date(t0 + i * 60_000).toISOString(),
      read_at: i % 2 ? null : read,
      delivered_at: read,
    })),
  );
  expect(error).toBeNull();

  // Nothing unread: it opens at the newest message.
  await a.goto("/chat");
  await expect(a.getByText("old line 59")).toBeVisible({ timeout: 15000 });
  await expect.poll(() => atBottom(a)).toBe(true);
  await expect(a.getByRole("separator", { name: "Unread messages" })).toHaveCount(0);

  // Theo writes a lot while Nia is away (more than a screen's worth).
  await a.goto("/us");
  const t1 = Date.now() - 120_000;
  await admin.from("messages").insert(
    Array.from({ length: 25 }, (_, i) => ({
      couple_id: coupleId,
      sender_id: theo.id,
      client_id: randomUUID(),
      type: "text",
      body: i === 0 ? "are you up?" : `news ${String(i).padStart(2, "0")}`,
      sent_at: new Date(t1 + i * 1000).toISOString(),
    })),
  );

  // It opens at the first unread one, divider just above it near the top,
  // not at the newest (which is further down).
  await a.goto("/chat");
  const divider = a.getByRole("separator", { name: "Unread messages" });
  await expect(divider).toBeVisible({ timeout: 15000 });
  await expect(a.getByText("are you up?")).toBeInViewport();
  await expect(a.getByText("news 24")).not.toBeInViewport();
  const top = await divider.evaluate((el) => {
    const list = el.closest("[aria-live=polite]")!.getBoundingClientRect();
    return el.getBoundingClientRect().top - list.top;
  });
  expect(top).toBeLessThan(200);
  // And they're marked read as usual.
  await expect
    .poll(
      async () =>
        (
          await admin
            .from("messages")
            .select("id")
            .eq("couple_id", coupleId)
            .eq("sender_id", theo.id)
            .is("read_at", null)
        ).data?.length,
    )
    .toBe(0);
});
