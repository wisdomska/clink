import { test, expect } from "./fixtures";

/** The other person's audio is attached, live and actually playing. */
function remoteAudioPlaying() {
  return Array.from(document.querySelectorAll("audio")).some((el) => {
    const s = el.srcObject as MediaStream | null;
    return Boolean(s && !el.paused && s.getAudioTracks().some((t) => t.readyState === "live"));
  });
}

// In-app calls: no phone number. Signalling over the couple channel, media
// peer to peer. Chromium's fake camera and microphone stand in for devices.
test.describe("Calls", () => {
  test("video call: ring, accept, connect, mute, camera off, hang up", async ({ couple }) => {
    test.setTimeout(90_000);
    const { a, b } = couple;
    await b.goto("/us");
    await a.goto("/chat");
    await a.getByRole("button", { name: "Video call" }).click();
    const outgoing = a.getByRole("dialog", { name: "Video call with Theo" });
    await expect(outgoing).toBeVisible();
    await expect(outgoing.getByText(/Ringing|Calling/)).toBeVisible();

    // Theo gets it on whatever screen he's on.
    const incoming = b.getByRole("dialog", { name: "Video call with Nia" });
    await expect(incoming.getByText("Incoming video call")).toBeVisible({ timeout: 15000 });
    await incoming.getByRole("button", { name: "Accept" }).click();

    // Connected: the timer runs on both sides and remote video plays.
    await expect(outgoing.getByText(/^0:0\d$/)).toBeVisible({ timeout: 20000 });
    await expect(incoming.getByText(/^0:0\d$/)).toBeVisible({ timeout: 20000 });
    // Both sides really see each other: your own preview plus their live video,
    // and their sound is playing through the audio element.
    for (const p of [a, b]) {
      await expect
        .poll(() =>
          p.evaluate(
            () =>
              Array.from(document.querySelectorAll("video")).filter((v) => v.videoWidth > 0).length,
          ),
        )
        .toBeGreaterThanOrEqual(2);
      await expect.poll(() => p.evaluate(remoteAudioPlaying)).toBe(true);
    }

    await outgoing.getByRole("button", { name: "Mute" }).click();
    await expect(outgoing.getByRole("button", { name: "Unmute" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await outgoing.getByRole("button", { name: "Camera off" }).click();
    await expect(incoming.getByText("Nia's camera is off")).toBeVisible();

    await incoming.getByRole("button", { name: "End" }).click();
    await expect(incoming).toBeHidden();
    await expect(outgoing.getByText("Call ended.")).toBeVisible();
    await expect(outgoing).toBeHidden({ timeout: 6000 });
  });

  test("voice call: declining tells the caller", async ({ couple }) => {
    const { a, b } = couple;
    await b.goto("/play");
    await a.goto("/chat");
    await a.getByRole("button", { name: "Call", exact: true }).click();
    const incoming = b.getByRole("dialog", { name: "Voice call with Nia" });
    await expect(incoming.getByText("Incoming voice call")).toBeVisible({ timeout: 15000 });
    await incoming.getByRole("button", { name: "Decline" }).click();
    await expect(
      a
        .getByRole("dialog", { name: "Voice call with Theo" })
        .getByText("They can't pick up right now."),
    ).toBeVisible();
  });

  test("voice call connects with sound both ways", async ({ couple }) => {
    test.setTimeout(60_000);
    const { a, b } = couple;
    await b.goto("/us");
    await a.goto("/chat");
    await a.getByRole("button", { name: "Call", exact: true }).click();
    const incoming = b.getByRole("dialog", { name: "Voice call with Nia" });
    await expect(incoming.getByText("Incoming voice call")).toBeVisible({ timeout: 15000 });
    await incoming.getByRole("button", { name: "Accept" }).click();
    const outgoing = a.getByRole("dialog", { name: "Voice call with Theo" });
    await expect(outgoing.getByText(/^0:0\d$/)).toBeVisible({ timeout: 20000 });
    await expect(incoming.getByText(/^0:0\d$/)).toBeVisible({ timeout: 20000 });
    await expect.poll(() => a.evaluate(remoteAudioPlaying)).toBe(true);
    await expect.poll(() => b.evaluate(remoteAudioPlaying)).toBe(true);
    await outgoing.getByRole("button", { name: "End" }).click();
    await expect(incoming).toBeHidden({ timeout: 6000 });
  });

  test("calling each other at the same moment joins one call, never busy", async ({ couple }) => {
    test.setTimeout(60_000);
    const { a, b } = couple;
    await a.goto("/chat");
    await b.goto("/chat");
    await Promise.all([
      a.getByRole("button", { name: "Video call" }).click(),
      b.getByRole("button", { name: "Video call" }).click(),
    ]);
    const onA = a.getByRole("dialog", { name: "Video call with Theo" });
    const onB = b.getByRole("dialog", { name: "Video call with Nia" });
    await expect(onA.getByText(/^0:0\d$/)).toBeVisible({ timeout: 20000 });
    await expect(onB.getByText(/^0:0\d$/)).toBeVisible({ timeout: 20000 });
    await expect(a.getByText(/another call/)).toHaveCount(0);
    await expect(b.getByText(/another call/)).toHaveCount(0);
    for (const p of [a, b]) await expect.poll(() => p.evaluate(remoteAudioPlaying)).toBe(true);
    await onA.getByRole("button", { name: "End" }).click();
    await expect(onB).toBeHidden({ timeout: 6000 });
  });
});

// Phones on mobile data can't reach each other directly; the TURN relay
// carries the call. Forced relay-only, it must still connect with sound.
test("calls connect through the TURN relay alone", async ({ couple }) => {
  test.skip(!process.env.CF_TURN_KEY_ID, "needs the Cloudflare TURN key");
  test.setTimeout(60_000);
  const { a, b } = couple;
  for (const p of [a, b]) {
    await p.goto("/us");
    await p.evaluate(() => localStorage.setItem("clink_force_relay", "1"));
  }
  await a.goto("/chat");
  await a.getByRole("button", { name: "Video call" }).click();
  const incoming = b.getByRole("dialog", { name: "Video call with Nia" });
  await expect(incoming.getByText("Incoming video call")).toBeVisible({ timeout: 15000 });
  await incoming.getByRole("button", { name: "Accept" }).click();
  const outgoing = a.getByRole("dialog", { name: "Video call with Theo" });
  await expect(outgoing.getByText(/^0:0\d$/)).toBeVisible({ timeout: 25000 });
  for (const p of [a, b]) {
    await expect
      .poll(() =>
        p.evaluate(
          () =>
            Array.from(document.querySelectorAll("video")).filter((v) => v.videoWidth > 0).length,
        ),
      )
      .toBeGreaterThanOrEqual(2);
    await expect.poll(() => p.evaluate(remoteAudioPlaying)).toBe(true);
  }
  await outgoing.getByRole("button", { name: "End" }).click();
});

test.describe("Calls: features and closed-app ringing", () => {
  test("speaker, voice to video, reactions and mute indicator", async ({ couple }) => {
    test.setTimeout(90_000);
    const { a, b } = couple;
    await b.goto("/us");
    await a.goto("/chat");
    await a.getByRole("button", { name: "Call", exact: true }).click();
    const incoming = b.getByRole("dialog", { name: "Voice call with Nia" });
    await expect(incoming.getByText("Incoming voice call")).toBeVisible({ timeout: 15000 });
    await incoming.getByRole("button", { name: "Accept" }).click();
    const onA = a.getByRole("dialog", { name: /call with Theo/ });
    await expect(onA.getByText(/^0:0\d$/)).toBeVisible({ timeout: 20000 });

    // Speaker: off by default on a voice call, toggles on.
    const speaker = onA.getByRole("button", { name: "Speaker" });
    await expect(speaker).toHaveAttribute("aria-pressed", "false");
    await speaker.click();
    await expect(speaker).toHaveAttribute("aria-pressed", "true");

    // Mute shows on the other side.
    await onA.getByRole("button", { name: "Mute" }).click();
    await expect(b.getByText("Nia is muted")).toBeVisible();
    await onA.getByRole("button", { name: "Unmute" }).click();
    await expect(b.getByText("Nia is muted")).toHaveCount(0);

    // Reactions float up on both screens.
    await onA.getByRole("button", { name: "React", exact: true }).click();
    await onA.getByRole("button", { name: "React ❤️" }).click();
    await expect(b.locator("span", { hasText: "❤️" }).first()).toBeAttached();

    // Voice to video mid-call: Theo now gets Nia's camera.
    await onA.getByRole("button", { name: "Video", exact: true }).click();
    await expect(a.getByRole("dialog", { name: "Video call with Theo" })).toBeVisible();
    await expect(b.getByRole("dialog", { name: "Video call with Nia" })).toBeVisible();
    await expect
      .poll(
        () =>
          b.evaluate(
            () =>
              Array.from(document.querySelectorAll("video")).filter((v) => v.videoWidth > 0).length,
          ),
        { timeout: 20000 },
      )
      .toBeGreaterThanOrEqual(1);
    await a
      .getByRole("dialog", { name: "Video call with Theo" })
      .getByRole("button", { name: "End" })
      .click();
  });

  test("Decline from the notification tells the caller, without opening Clink", async ({
    couple,
  }) => {
    const { a, b } = couple;
    await a.goto("/chat");
    const ring = a.waitForRequest((r) => r.url().endsWith("/api/calls/ring"));
    await a.getByRole("button", { name: "Call", exact: true }).click();
    const { id } = (await ring).postDataJSON() as { id: string };
    // What the service worker does for the notification's Decline action.
    await b.goto("/settings");
    const r = await b.request.post("/api/calls/decline", { data: { id } });
    expect(r.ok()).toBeTruthy();
    await expect(
      a
        .getByRole("dialog", { name: "Voice call with Theo" })
        .getByText("They can't pick up right now."),
    ).toBeVisible({ timeout: 15000 });
  });

  test("Answer from the notification opens Clink straight into the call", async ({ couple }) => {
    test.setTimeout(60_000);
    const { a, b } = couple;
    await a.goto("/chat");
    const ring = a.waitForRequest((r) => r.url().endsWith("/api/calls/ring"));
    await a.getByRole("button", { name: "Call", exact: true }).click();
    const { id } = (await ring).postDataJSON() as { id: string };
    // Theo had Clink closed; the notification's Answer opens this URL.
    await b.goto(`/us?answer=${id}`);
    await expect(
      a.getByRole("dialog", { name: "Voice call with Theo" }).getByText(/^0:0\d$/),
    ).toBeVisible({ timeout: 25000 });
    await expect(b.getByRole("dialog", { name: "Voice call with Nia" })).toBeVisible();
    await expect(b).not.toHaveURL(/answer=/);
  });
});
