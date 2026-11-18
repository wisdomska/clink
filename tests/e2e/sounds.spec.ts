import { test, expect } from "./fixtures";

test("Settings lists every sound with a preview; the hang-up sound can be switched off", async ({
  couple,
}) => {
  const { a } = couple;
  await a.addInitScript(() => {
    const w = window as unknown as { __played: string[] };
    w.__played = [];
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function (this: HTMLMediaElement) {
      if (this.src && !this.muted) w.__played.push(this.src);
      return play.call(this);
    };
  });
  await a.goto("/settings?tab=alerts");
  const sounds = a.getByRole("region", { name: "Sounds" });
  await sounds.getByRole("button", { name: "Play the hang-up sound" }).click();
  await expect
    .poll(() => a.evaluate(() => (window as unknown as { __played: string[] }).__played.join(" ")))
    .toContain("/sounds/hangup.mp3");
  const sw = sounds.getByRole("switch", { name: /Hang-up sound/ });
  await expect(sw).toHaveAttribute("aria-checked", "true");
  await sw.click();
  await expect(sw).toHaveAttribute("aria-checked", "false");
  await a.reload();
  await expect(
    a.getByRole("region", { name: "Sounds" }).getByRole("switch", { name: /Hang-up sound/ }),
  ).toHaveAttribute("aria-checked", "false");
  expect(await a.evaluate(() => localStorage.getItem("clink_hangup_tone"))).toBe("off");
});
