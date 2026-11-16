import { randomUUID } from "node:crypto";
import { test, expect } from "./fixtures";
import { pickTime } from "./controls";
import { admin } from "./helpers";

test("global search finds messages and list items, never sealed letters", async ({ couple }) => {
  const { a, nia, theo } = couple;
  const token = `zebra${Date.now().toString(36)}`;
  const coupleId = (
    await admin.from("couple_members").select("couple_id").eq("user_id", nia.id).single()
  ).data!.couple_id;
  const msg = await admin
    .from("messages")
    .insert({
      couple_id: coupleId,
      sender_id: theo.id,
      client_id: randomUUID(),
      type: "text",
      body: `the ${token} crossing photo`,
    })
    .select("id")
    .single();
  await admin
    .from("bucket_items")
    .insert({ couple_id: coupleId, created_by: theo.id, text: `See a ${token} in Kenya` });
  // Theo's letter to Nia is still sealed: its words must not show up.
  await admin.from("letters").insert({
    couple_id: coupleId,
    author_id: theo.id,
    condition: "Open when you miss me",
    body: `sealed ${token} secret`,
  });
  // Nia's own letter is hers to search.
  await admin.from("letters").insert({
    couple_id: coupleId,
    author_id: nia.id,
    condition: "Open when it rains",
    body: `my ${token} words`,
  });

  const api = await (await a.request.get(`/api/search?q=${token}`)).json();
  expect(api.messages.map((m: { id: string }) => m.id)).toContain(msg.data!.id);
  expect(api.letters).toHaveLength(1);
  expect(JSON.stringify(api)).not.toContain("sealed");
  expect((await a.request.get("/api/search?q=a")).status()).toBe(422);

  await a.goto("/search");
  await a.getByRole("searchbox", { name: "Search Clink" }).fill(token);
  await expect(a.getByRole("status").filter({ hasText: /3 results/ })).toBeVisible({
    timeout: 10000,
  });
  await expect(a.getByRole("region", { name: "Messages" })).toBeVisible();
  await expect(a.getByRole("region", { name: "Letters" })).toContainText("Open when it rains");
  await expect(a.getByRole("region", { name: "Our list" })).toBeVisible();
  await expect(a.getByText(/sealed/)).toHaveCount(0);

  // Filter, then jump to the message in chat.
  await a.getByRole("button", { name: /^Messages/ }).click();
  await expect(a.getByRole("region", { name: "Our list" })).toBeHidden();
  await a.getByRole("link", { name: new RegExp(`${token} crossing`) }).click();
  await expect(a).toHaveURL(/\/chat\?m=/);
  await expect(
    a.getByRole("button", { name: new RegExp(`Theo: the ${token} crossing photo`) }),
  ).toBeFocused({ timeout: 10000 });
});

test("press / to search from Plans on desktop", async ({ couple }, info) => {
  test.skip(info.project.name !== "desktop", "Keyboard shortcut is desktop only");
  const { a } = couple;
  await a.goto("/plans");
  await a.keyboard.press("/");
  await expect(a).toHaveURL(/\/search/);
  await expect(a.getByRole("searchbox", { name: "Search Clink" })).toBeFocused();
});

test("calendar shows birthdays and books a date on a tapped day", async ({ couple }) => {
  const { a, nia, theo } = couple;
  // Theo shares his birthday; it should land on the calendar for Nia.
  const next = new Date();
  next.setUTCMonth(next.getUTCMonth() + 1, 15);
  const mm = String(next.getUTCMonth() + 1).padStart(2, "0");
  await admin
    .from("user_private")
    .update({ dob: `1996-${mm}-15` })
    .eq("user_id", theo.id);
  await admin.from("profiles").update({ share_birthday: true }).eq("id", theo.id);

  await a.goto("/calendar");
  await expect(a.getByRole("heading", { name: "Calendar", level: 1 })).toBeVisible();
  await expect(a.getByRole("button", { name: /today/ })).toHaveAttribute("aria-current", "date");
  await a.getByRole("button", { name: "Next month" }).click();
  const day = a.getByRole("button", { name: /15 \w+, 1 event: Theo's birthday/ });
  await expect(day).toBeVisible({ timeout: 10000 });
  await day.click();
  await expect(a.getByRole("heading", { level: 2 }).filter({ hasText: /15/ })).toBeVisible();

  await a.getByRole("button", { name: "Plan a date" }).click();
  const sheet = a.getByRole("dialog", { name: "Plan a date" });
  await pickTime(sheet, "Your time", "19:30");
  await sheet.getByRole("button", { name: "Book it" }).click();
  await expect(sheet).toBeHidden();
  await expect(a.getByRole("button", { name: /15 \w+, 2 events/ })).toBeVisible({ timeout: 10000 });

  const coupleId = (
    await admin.from("couple_members").select("couple_id").eq("user_id", nia.id).single()
  ).data!.couple_id;
  const { count } = await admin
    .from("scheduled_dates")
    .select("id", { count: "exact", head: true })
    .eq("couple_id", coupleId);
  expect(count).toBe(1);

  // Deep links from search open on that day.
  await a.goto(`/calendar?d=${next.getUTCFullYear()}-${mm}-15`);
  await expect(a.getByRole("button", { name: /15 \w+, 2 events/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});
