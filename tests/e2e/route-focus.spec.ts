import { test, expect } from "./fixtures";

test("after moving to another screen, focus lands on its title", async ({ couple }) => {
  const { a } = couple;
  await a.goto("/us");
  await a
    .getByRole("link", { name: "Plans", exact: true })
    .filter({ visible: true })
    .first()
    .click();
  await expect(a).toHaveURL(/\/plans/);
  await expect.poll(() => a.evaluate(() => document.activeElement?.tagName)).toBe("H1");
  // Search keeps its own focus in the search box.
  await a.goto("/us");
  await a.goto("/search");
  await expect(a.getByRole("searchbox", { name: "Search Clink" })).toBeFocused();
});
