import { test, expect } from "./fixtures";
import { admin } from "./helpers";

// Live games: both partners answer at the same moment. Every answer must count,
// with no "They just moved" errors and no lost picks.
test("simultaneous answers are never lost", async ({ couple }) => {
  const { a, b } = couple;
  const id = (await (await a.request.post("/api/games", { data: { type: "know_me" } })).json())
    .id as string;
  expect((await b.request.post(`/api/games/${id}/join`)).ok()).toBeTruthy();
  for (let i = 0; i < 10; i++) {
    const [ra, rb] = await Promise.all([
      a.request.post(`/api/games/${id}/move`, { data: { move: { pick: i % 4 } } }),
      b.request.post(`/api/games/${id}/move`, { data: { move: { pick: (i + 1) % 4 } } }),
    ]);
    expect(ra.status(), await ra.text()).toBe(200);
    expect(rb.status(), await rb.text()).toBe(200);
  }
  const { data: g } = await admin.from("games").select("status, state").eq("id", id).single();
  expect(g!.status).toBe("finished");
  expect((g!.state as { reveals: unknown[] }).reveals).toHaveLength(10);
});
