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

// A note in a format this browser can't play says so, with the file to
// download, instead of a play button that silently does nothing.
test("a voice note this device can't play says so and offers the file", async ({ couple }) => {
  const { a, b, nia } = couple;
  await a.goto("/chat");
  await a.getByRole("button", { name: "Hold to record a voice note" }).click();
  await a.waitForTimeout(1200);
  await a.getByRole("button", { name: "Send voice note" }).click();
  await expect
    .poll(
      async () =>
        (await admin.from("messages").select("id").eq("sender_id", nia.id).eq("type", "voice")).data
          ?.length ?? 0,
      { timeout: 15000 },
    )
    .toBe(1);
  // Serve the recording as bytes no browser can decode.
  await b.route(
    (url) => !url.pathname.startsWith("/_next") && !url.pathname.startsWith("/api/"),
    async (route) =>
      route.request().resourceType() === "media"
        ? route.fulfill({ status: 200, contentType: "audio/mp4", body: Buffer.from("not audio") })
        : route.fallback(),
  );
  const errors: string[] = [];
  b.on("pageerror", (e) => errors.push(e.message));
  await b.goto("/chat");
  await b.getByRole("button", { name: /Play voice note/ }).click();
  await expect(b.getByText("This voice note can't play on this device.")).toBeVisible({
    timeout: 10000,
  });
  await expect(b.getByRole("link", { name: "Download voice note" })).toHaveAttribute(
    "download",
    "",
  );
  expect(errors.filter((e) => /supported source/i.test(e))).toEqual([]);
});
