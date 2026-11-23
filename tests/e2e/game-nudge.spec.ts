import pg from "pg";
import { test, expect } from "./fixtures";

const dbUrl =
  process.env.TEST_DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

/** Makes the last move look `hours` old (triggers off for this one update). */
async function age(gameId: string, hours: number) {
  const db = new pg.Client({ connectionString: dbUrl });
  await db.connect();
  try {
    await db.query("set session_replication_role = replica");
    await db.query(
      "update public.games set updated_at = now() - make_interval(hours => $2) where id = $1",
      [gameId, hours],
    );
  } finally {
    await db.end();
  }
}

test("a gentle nudge: only after 12 hours, once per move", async ({ couple }) => {
  test.setTimeout(90_000);
  const { a } = couple;
  await a.goto("/play");
  await a.getByRole("button", { name: "Play Four Up with Theo" }).click();
  await a.waitForURL(/\/play\/fourup\//);
  const id = a.url().split("/").pop()!;
  await a.getByRole("button", { name: /^Column 4/ }).click();
  await expect(a.getByText("Theo's move")).toBeVisible({ timeout: 10000 });

  // Too soon: it says when.
  await expect(a.getByText(/You can nudge Theo in 1[12] h\./)).toBeVisible();
  const early = await a.request.post(`/api/games/${id}/nudge`);
  expect(early.status()).toBe(429);

  // Twelve hours on, one nudge goes; a second for the same move doesn't.
  await age(id, 13);
  await a.reload();
  await a.getByRole("button", { name: "Nudge Theo" }).click();
  await expect(a.getByText("Nudged. Theo will see it.")).toBeVisible({ timeout: 10000 });
  const again = await a.request.post(`/api/games/${id}/nudge`);
  expect(again.status()).toBe(409);

  // You can't nudge on your own move.
  const theirs = await couple.b.request.post(`/api/games/${id}/nudge`);
  expect((await theirs.json()).error).toBe("your_turn");
});
