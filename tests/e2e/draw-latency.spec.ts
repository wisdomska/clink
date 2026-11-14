import { test, expect } from "./fixtures";

// PLAY-03: a stroke reaches the partner's canvas well inside the 300 ms budget
// (strokes are batched every 50 ms and sent over the couple's realtime channel).
test("draw and guess strokes arrive in under 300 ms", async ({ couple }, info) => {
  test.skip(info.project.name !== "desktop", "One timing run is enough");
  const { a, b } = couple;
  const id = (await (await a.request.post("/api/games", { data: { type: "draw_guess" } })).json())
    .id as string;
  await b.request.post(`/api/games/${id}/join`);
  await a.goto(`/play/draw_guess/${id}`);
  await b.goto(`/play/draw_guess/${id}`);

  const canvasA = a.getByRole("img", { name: /^Canvas\. Draw/ });
  const canvasB = b.getByRole("img", { name: "Nia's drawing" });
  await expect(canvasA).toBeVisible();
  await expect(canvasB).toBeVisible();
  // Let both realtime subscriptions settle.
  await a.waitForTimeout(1500);

  const samples: number[] = [];
  for (let i = 0; i < 5; i++) {
    const seen = b.evaluate(
      (n) =>
        new Promise<number>((resolve) => {
          const box = document.querySelector('[aria-label="Nia\'s drawing"] svg')!;
          const check = () => {
            if (box.querySelectorAll("path").length > n) {
              obs.disconnect();
              resolve(Date.now());
            }
          };
          const obs = new MutationObserver(check);
          obs.observe(box, { childList: true, subtree: true, attributes: true });
          check();
        }),
      i,
    );
    const r = (await canvasA.boundingBox())!;
    const x = r.x + 40 + i * 40;
    const y = r.y + 60;
    const start = Date.now();
    await a.mouse.move(x, y);
    await a.mouse.down();
    await a.mouse.move(x + 20, y + 30, { steps: 3 });
    await a.mouse.up();
    samples.push((await seen) - start);
  }
  samples.sort((p, q) => p - q);
  const median = samples[2]!;
  console.log(`stroke latency ms: ${samples.join(", ")} (median ${median})`);
  expect(median).toBeLessThan(300);
});
