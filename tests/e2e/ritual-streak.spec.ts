import { test, expect } from "./fixtures";
import { admin } from "./helpers";

const dayKey = (daysAgo: number) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(d);
};

test("the ritual counts the days you both answered", async ({ couple }) => {
  const { a, nia, theo } = couple;
  const coupleId = (
    await admin.from("couple_members").select("couple_id").eq("user_id", nia.id).single()
  ).data!.couple_id as string;
  const rows = [1, 2].flatMap((n) =>
    [nia.id, theo.id].map((u) => ({
      couple_id: coupleId,
      day: dayKey(n),
      user_id: u,
      prompt_id: 1,
      answer: "the sea at Busua",
    })),
  );
  const { error } = await admin.from("ritual_answers").insert(rows);
  expect(error).toBeNull();
  await a.goto("/us");
  await expect(a.getByLabel("2 days in a row, both of you")).toBeVisible({ timeout: 15000 });
});
