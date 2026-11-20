import { test, expect } from "./fixtures";

// Regression: the screen title got a tabindex from RouteFocus before React had
// taken over the page, a hydration mismatch (React #418) logged on Settings.
test("main screens load without hydration mismatches", async ({ couple }) => {
  test.setTimeout(120_000);
  const { a } = couple;
  const bad: string[] = [];
  const watch = (t: string) => /#418|#419|#423|#425|hydrat/i.test(t) && bad.push(t.slice(0, 300));
  a.on("console", (m) => m.type() === "error" && watch(m.text()));
  a.on("pageerror", (e) => watch(e.message));
  for (const path of ["/settings", "/us", "/chat", "/play", "/plans"]) {
    await a.goto(path);
    await expect(a.getByRole("heading", { level: 1 }).first()).toBeVisible({ timeout: 15000 });
    await a.waitForTimeout(1500);
  }
  expect(bad).toEqual([]);
});
