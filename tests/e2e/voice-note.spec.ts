import { test, expect } from "./fixtures";
import { admin } from "./helpers";

// CHAT-02: hold the mic to record a voice note; release to send; the partner can play it.
test("record, send and play a voice note", async ({ couple }) => {
  const { a, b, nia } = couple;
  const errors: string[] = [];
  a.on("pageerror", (e) => errors.push(e.message));
  a.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await a.goto("/chat");
  await b.goto("/chat");
  const mic = a.getByRole("button", { name: "Hold to record a voice note" });
  const box = (await mic.boundingBox())!;
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  if (test.info().project.name === "desktop") {
    await a.mouse.move(x, y);
    await a.mouse.down();
    await a.waitForTimeout(2200);
    await a.mouse.up();
  } else {
    // A real finger: touch start, hold, touch end (long-press behaviour included).
    const cdp = await a.context().newCDPSession(a);
    const pt = [{ x, y, id: 1 }];
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: pt });
    await a.waitForTimeout(2200);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  }

  await expect
    .poll(
      async () => {
        const { data } = await admin
          .from("messages")
          .select("type, media_ids")
          .eq("sender_id", nia.id)
          .eq("type", "voice");
        return data?.length ?? 0;
      },
      { timeout: 15000, message: `errors: ${errors.join(" | ")}` },
    )
    .toBe(1);
  const play = b.getByRole("button", { name: /Play voice note/ });
  await expect(play).toBeVisible({ timeout: 10000 });
  await play.click();
  await expect(b.getByRole("button", { name: /Pause voice note/ })).toBeVisible({ timeout: 10000 });
});

// Tap mode: a quick tap starts recording; the send button finishes it.
test("tap to record, then send", async ({ couple }) => {
  const { a, nia } = couple;
  await a.goto("/chat");
  await a.getByRole("button", { name: "Hold to record a voice note" }).click();
  await expect(a.getByRole("status", { name: /Tap send when you're done/ })).toBeVisible();
  await a.waitForTimeout(1500);
  await a.getByRole("button", { name: "Send voice note" }).click();
  await expect
    .poll(
      async () =>
        (await admin.from("messages").select("id").eq("sender_id", nia.id).eq("type", "voice")).data
          ?.length ?? 0,
      { timeout: 15000 },
    )
    .toBe(1);
});
