import { readFileSync } from "node:fs";
import { test, expect } from "./fixtures";

// A shortest ladder between two words, for the test to play.
function solve(start: string, target: string): string[] {
  // Everyday words only, as par is worked out (wordlist-english levels 10 and 20).
  const words = new Set(
    ["english-words-10", "english-words-20", "british-words-10", "british-words-20"]
      .flatMap(
        (f) =>
          JSON.parse(readFileSync(`node_modules/wordlist-english/${f}.json`, "utf8")) as string[],
      )
      .filter((w) => /^[a-z]{4}$/.test(w)),
  );
  const prev = new Map<string, string | null>([[start, null]]);
  const q = [start];
  for (let i = 0; i < q.length; i++) {
    const w = q[i]!;
    if (w === target) break;
    for (let k = 0; k < 4; k++)
      for (let c = 97; c < 123; c++) {
        const n = w.slice(0, k) + String.fromCharCode(c) + w.slice(k + 1);
        if (words.has(n) && !prev.has(n)) {
          prev.set(n, w);
          q.push(n);
        }
      }
  }
  const path = [target];
  while (prev.get(path[0]!)) path.unshift(prev.get(path[0]!)!);
  return path;
}

test("the daily ladder: same puzzle for you both, no peeking until you've finished", async ({
  couple,
}) => {
  test.setTimeout(120_000);
  const { a, b } = couple;
  await a.goto("/play");
  await a.getByRole("link", { name: /Daily ladder/ }).click();
  await a.waitForURL(/\/play\/ladder$/);
  const day = await a.evaluate(() => new Date().toISOString().slice(0, 10));
  const res = await a.request.get(`/api/ladder?day=${day}`);
  const puzzle = (await res.json()) as { start: string; target: string; par: number; day: string };
  const path = solve(puzzle.start, puzzle.target);
  expect(path.length - 1).toBe(puzzle.par);

  // A step that changes two letters, or isn't a word, is refused.
  const input = a.getByLabel("Next word");
  await input.fill(puzzle.target === "zzzz" ? "yyyy" : "qzqz");
  await a.getByRole("button", { name: "Step", exact: true }).click();
  await expect(a.getByText(/Change exactly one letter|isn't in the dictionary/)).toBeVisible();

  // Nia climbs it in par.
  for (const w of path.slice(1)) {
    await input.fill(w);
    await a.getByRole("button", { name: "Step", exact: true }).click();
    await expect(a.getByRole("list", { name: "Your ladder" }).getByText(w)).toBeVisible({
      timeout: 10000,
    });
  }
  await expect(a.getByText("Par. Perfect.")).toBeVisible({ timeout: 10000 });
  await expect(a.getByText("Not yet. We'll let them know.")).toBeVisible();
  // No hints were used, so none are mentioned.
  await expect(a.getByText(/hint/)).toHaveCount(0);

  // Theo sees she's done, but not her ladder, until he finishes his.
  const peek = await (await b.request.get(`/api/ladder?day=${puzzle.day}`)).json();
  expect(peek.theirs).toEqual({ done: true });
  await b.goto("/play/ladder");
  await expect(b.getByText("Nia has finished. Climb yours to see how they did.")).toBeVisible();
  // Stuck? A hint fills in the next everyday word on a best route.
  await b.getByRole("button", { name: "Show me a step" }).click();
  await expect(b.getByLabel("Next word")).toHaveValue(path[1]!);
  await expect(b.getByText(/· 1 hint/)).toBeVisible();
  // Handing in a broken ladder is refused by the server.
  const bad = await b.request.post("/api/ladder", {
    data: { day: puzzle.day, path: [puzzle.start, puzzle.target], seconds: 5 },
  });
  expect(bad.status()).toBe(422);
  const good = await b.request.post("/api/ladder", {
    data: { day: puzzle.day, path, seconds: 40 },
  });
  expect(good.ok()).toBeTruthy();
  await b.reload();
  await expect(b.getByRole("list", { name: "Nia's ladder" })).toBeVisible({ timeout: 10000 });
  // And only once a day.
  expect(
    (
      await b.request.post("/api/ladder", { data: { day: puzzle.day, path, seconds: 40 } })
    ).status(),
  ).toBe(409);
});
