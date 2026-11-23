import { randomUUID } from "node:crypto";
import type { Page } from "@playwright/test";
import { test, expect } from "./fixtures";
import { admin, waitLive } from "./helpers";

const listOf = (p: Page) => p.locator("[aria-live=polite].overflow-y-auto").first();
const atBottom = (p: Page) =>
  listOf(p).evaluate((el) => el.scrollHeight - el.scrollTop - el.clientHeight < 80);

test("scrolled up, new messages show a Jump to latest button with a count", async ({ couple }) => {
  test.setTimeout(120_000);
  const { a, nia, theo } = couple;
  const coupleId = (
    await admin.from("couple_members").select("couple_id").eq("user_id", nia.id).single()
  ).data!.couple_id as string;
  const t0 = Date.now() - 86_400_000;
  const read = new Date().toISOString();
  await admin.from("messages").insert(
    Array.from({ length: 50 }, (_, i) => ({
      couple_id: coupleId,
      sender_id: i % 2 ? nia.id : theo.id,
      client_id: randomUUID(),
      type: "text",
      body: `line ${String(i).padStart(2, "0")}`,
      sent_at: new Date(t0 + i * 60_000).toISOString(),
      read_at: read,
      delivered_at: read,
    })),
  );

  await a.goto("/chat");
  await expect(a.getByText("line 49")).toBeVisible({ timeout: 15000 });
  await expect.poll(() => atBottom(a)).toBe(true);
  await waitLive(a, "chatLive");
  // Live updates are flowing (one arrives while at the bottom, and it stays there).
  await admin.from("messages").insert({
    couple_id: coupleId,
    sender_id: theo.id,
    client_id: randomUUID(),
    type: "text",
    body: "live check",
    sent_at: new Date().toISOString(),
  });
  await expect(a.getByText("live check")).toBeVisible({ timeout: 20000 });
  await expect.poll(() => atBottom(a)).toBe(true);
  // At the bottom there's nothing to jump to.
  await expect(a.getByRole("button", { name: /^Jump to latest/ })).toHaveCount(0);

  // Scroll up to read: the button appears, without a count yet.
  await listOf(a).hover();
  for (let i = 0; i < 6; i++) await a.mouse.wheel(0, -1500);
  await expect.poll(() => atBottom(a)).toBe(false);
  await expect(a.getByRole("button", { name: "Jump to latest", exact: true })).toBeVisible();

  // Theo sends three: the count shows, and the view doesn't move.
  await admin.from("messages").insert(
    ["one", "two", "three"].map((w, i) => ({
      couple_id: coupleId,
      sender_id: theo.id,
      client_id: randomUUID(),
      type: "text",
      body: `fresh ${w}`,
      sent_at: new Date(Date.now() + i).toISOString(),
    })),
  );
  const jump = a.getByRole("button", { name: "Jump to latest, 3 new messages" });
  await expect(jump).toBeVisible({ timeout: 15000 });
  await expect(jump).toContainText("3 new");
  expect(await atBottom(a)).toBe(false);

  // One tap lands on the newest, and the button goes away.
  await jump.click();
  await expect(a.getByText("fresh three")).toBeInViewport();
  await expect.poll(() => atBottom(a)).toBe(true);
  await expect(a.getByRole("button", { name: /^Jump to latest/ })).toHaveCount(0);
});
