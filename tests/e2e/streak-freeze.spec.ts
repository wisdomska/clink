import { randomUUID } from "node:crypto";
import { test, expect } from "./fixtures";
import { admin } from "./helpers";

// A clink answered within a minute, at midday `daysAgo` days back (London time, as the test couples).
const answered = (daysAgo: number) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysAgo);
  d.setUTCHours(12, 0, 0, 0);
  return { created_at: d.toISOString(), answered_at: new Date(d.getTime() + 60_000).toISOString() };
};

test("a shared streak freeze: repair yesterday, freeze today, two a month", async ({ couple }) => {
  test.setTimeout(90_000);
  const { a, b, nia, theo } = couple;
  const coupleId = (
    await admin.from("couple_members").select("couple_id").eq("user_id", nia.id).single()
  ).data!.couple_id as string;
  // A 3-day streak that ended the day before yesterday.
  const ins = await admin.from("clinks").insert(
    [2, 3, 4].map((n) => ({
      id: randomUUID(),
      couple_id: coupleId,
      sender_id: n % 2 ? nia.id : theo.id,
      kind: "tap",
      ...answered(n),
    })),
  );
  expect(ins.error).toBeNull();

  await b.goto("/us");
  const card = b.getByRole("region", { name: "Your 3-day streak slipped yesterday" });
  await expect(card).toBeVisible({ timeout: 15000 });
  await expect(card.getByText(/2 freezes left this month, shared with Nia/)).toBeVisible();
  await card.getByRole("button", { name: "Use a freeze" }).click();
  await expect(card).toBeHidden({ timeout: 10000 });
  await expect(b.getByText(/^3-day streak\./)).toBeVisible({ timeout: 10000 });
  // The streak, as a picture to share.
  await b.getByRole("button", { name: "Share our 3-day streak" }).click();
  await expect(b.locator("[data-share-card]").getByText("3 days")).toBeVisible();
  const download = b.waitForEvent("download");
  await b.getByRole("button", { name: "Save image" }).click();
  expect((await download).suggestedFilename()).toBe("clink-streak.png");
  await b.keyboard.press("Escape");

  // Nia plans a day off: today is frozen too.
  await a.goto("/us");
  await a.getByRole("button", { name: "Can't clink today? Freeze the streak" }).click();
  await expect(a.getByText(/1 freeze left this month, shared with Theo/)).toBeVisible();
  await a.getByRole("button", { name: "Freeze today" }).click();
  await expect(a.getByText("Today is frozen: your streak is safe.")).toBeVisible({
    timeout: 10000,
  });

  // That was this month's two.
  const third = await b.request.post("/api/streak/freeze", { data: { day: "today" } });
  expect(third.status()).toBe(409);
  const again = await b.request.post("/api/streak/freeze", { data: { day: "yesterday" } });
  expect((await again.json()).error).toBe("already");
});
