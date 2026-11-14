import { test, expect } from "./fixtures";

// CHAT-06: swipe a bubble right on a phone to reply; the reply quotes it for both.
test("swipe to reply quotes the message", async ({ couple }, info) => {
  test.skip(info.project.name !== "mobile", "Swipe is a touch gesture");
  const { a, b } = couple;
  const original = `left at 6 ${Date.now()}`;
  await b.goto("/chat");
  await b.getByLabel("Message Nia").fill(original);
  await b.getByRole("button", { name: "Send" }).click();

  await a.goto("/chat");
  const bubble = a.getByText(original);
  await expect(bubble).toBeVisible({ timeout: 10000 });
  const box = (await bubble.boundingBox())!;
  const y = box.y + box.height / 2;
  await bubble.evaluate(
    (el, { x0, y }) => {
      const fire = (type: string, x: number) =>
        el.dispatchEvent(
          new PointerEvent(type, {
            bubbles: true,
            pointerType: "touch",
            isPrimary: true,
            pointerId: 7,
            clientX: x,
            clientY: y,
          }),
        );
      fire("pointerdown", x0);
      for (let dx = 10; dx <= 90; dx += 10) fire("pointermove", x0 + dx);
      fire("pointerup", x0 + 90);
    },
    { x0: box.x + 10, y },
  );
  await expect(a.getByText(/Replying to Theo/)).toBeVisible();
  await a.getByLabel("Message Theo").fill("on my way");
  await a.getByRole("button", { name: "Send" }).click();

  // Theo sees the reply with the quote above it.
  const reply = b.getByText("on my way");
  await expect(reply).toBeVisible({ timeout: 10000 });
  await expect(reply.locator("xpath=..")).toContainText(original);
});
