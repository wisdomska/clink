import { randomUUID } from "node:crypto";
import { test, expect } from "./fixtures";
import { admin } from "./helpers";

// Older messages load as you scroll up, all the way back to the first one.
test("chat scrolls back through the whole history", async ({ couple }) => {
  const { a, nia, theo } = couple;
  const { data: member } = await admin
    .from("couple_members")
    .select("couple_id")
    .eq("user_id", nia.id)
    .is("left_at", null)
    .single();
  const t0 = Date.now() - 3 * 86400000;
  const rows = Array.from({ length: 130 }, (_, i) => ({
    couple_id: member!.couple_id,
    sender_id: i % 2 ? nia.id : theo.id,
    client_id: randomUUID(),
    type: i % 5 === 0 ? "clink" : "text",
    body: i % 5 === 0 ? "tap" : `history line ${String(i).padStart(3, "0")}`,
    sent_at: new Date(t0 + i * 60000).toISOString(),
  }));
  const { error } = await admin.from("messages").insert(rows);
  expect(error).toBeNull();

  await a.goto("/chat");
  await expect(a.getByText("history line 129")).toBeVisible({ timeout: 15000 });
  const list = a.locator("[aria-live=polite].overflow-y-auto").first();
  // Keep scrolling to the top until the first message has loaded (pages load
  // one at a time, slower on a busy CI runner).
  await expect
    .poll(
      async () => {
        await list.evaluate((el) => (el.scrollTop = 0));
        return a.getByText(/^history line 001/).isVisible();
      },
      { timeout: 45_000, intervals: [700] },
    )
    .toBe(true);
  // At the very top, it says so: nothing is hidden.
  await expect(a.getByText(/^Start of your chat with Theo/)).toBeVisible();
});
