import { test, expect } from "./fixtures";

function remoteAudioPlaying() {
  return Array.from(document.querySelectorAll("audio")).some((el) => {
    const s = el.srcObject as MediaStream | null;
    return Boolean(s && !el.paused && s.getAudioTracks().some((t) => t.readyState === "live"));
  });
}

// A reload mid-call (a new version, a stale screen) must not hang up: the page
// comes back to the same call and the other side waits for it.
test("a call survives a page reload, and ending it plays the hang-up tone", async ({ couple }) => {
  test.setTimeout(120_000);
  const { a, b } = couple;
  for (const p of [a, b])
    await p.addInitScript(() => {
      const w = window as unknown as { __played: string[] };
      w.__played = [];
      const play = HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play = function (this: HTMLMediaElement) {
        if (this.src && !this.muted) w.__played.push(this.src);
        return play.call(this);
      };
    });
  await b.goto("/us");
  await a.goto("/chat");
  await a.getByRole("button", { name: "Call", exact: true }).click();
  const incoming = b.getByRole("dialog", { name: "Voice call with Nia" });
  await incoming.getByRole("button", { name: "Accept" }).click();
  const onA = a.getByRole("dialog", { name: /call with Theo/ });
  const onB = b.getByRole("dialog", { name: /call with Nia/ });
  await expect(onA.getByText(/^0:0\d$/)).toBeVisible({ timeout: 20000 });
  await a.waitForTimeout(2000);

  // Nia's page reloads mid-call.
  await a.reload();
  await expect(a.getByRole("dialog", { name: /call with Theo/ })).toBeVisible({ timeout: 15000 });
  // Same call, timer carries on, audio flows both ways again.
  await expect(
    a.getByRole("dialog", { name: /call with Theo/ }).getByText(/^0:\d\d$/),
  ).toBeVisible();
  await expect.poll(() => a.evaluate(remoteAudioPlaying), { timeout: 20000 }).toBe(true);
  await expect.poll(() => b.evaluate(remoteAudioPlaying), { timeout: 20000 }).toBe(true);
  await expect(onB.getByText(/Call ended/)).toHaveCount(0);
  await expect(onB.getByText(/Reconnecting/)).toHaveCount(0, { timeout: 15000 });

  // Theo hangs up: both hear the hang-up tone.
  await onB.getByRole("button", { name: "End" }).click();
  for (const p of [a, b])
    await expect
      .poll(() =>
        p.evaluate(() => (window as unknown as { __played: string[] }).__played.join(" ")),
      )
      .toContain("/sounds/hangup.mp3");
});
