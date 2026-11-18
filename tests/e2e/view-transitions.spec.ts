import { test, expect } from "./fixtures";

test("switching screens uses a view transition (and still lands on the screen)", async ({
  couple,
}) => {
  const { a } = couple;
  await a.addInitScript(() => {
    const w = window as unknown as { __vt: number };
    w.__vt = 0;
    const d = document as unknown as { startViewTransition?: (...x: unknown[]) => unknown };
    const orig = d.startViewTransition?.bind(document);
    if (orig)
      d.startViewTransition = (...args: unknown[]) => {
        w.__vt++;
        return orig(...args);
      };
  });
  await a.goto("/us");
  await a
    .getByRole("link", { name: "Chat", exact: true })
    .filter({ visible: true })
    .first()
    .click();
  await expect(a).toHaveURL(/\/chat/);
  await expect(a.getByRole("textbox", { name: "Message Theo" })).toBeVisible();
  expect(await a.evaluate(() => (window as unknown as { __vt: number }).__vt)).toBeGreaterThan(0);
});
