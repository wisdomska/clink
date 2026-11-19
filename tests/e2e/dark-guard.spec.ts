import { test, expect } from "./fixtures";

test("After Dark entered in-app talks to no outside site and keeps no outside embeds", async ({
  couple,
}) => {
  const { a } = couple;
  await a.request.post("/api/dark/setup", { data: { pin: "2611", tiers: ["Flirty"] } });
  await a.request.post("/api/dark/notice");
  await a.request.post("/api/dark/unlock", { data: { pin: "2611" } });
  await a.goto("/us");
  await a
    .getByRole("link", { name: /After Dark/ })
    .filter({ visible: true })
    .first()
    .click();
  await expect(a).toHaveURL(/\/dark\/home/, { timeout: 15000 });
  await expect(a.getByRole("heading", { name: "After Dark" })).toBeVisible();

  const outside = () =>
    a.evaluate(() =>
      fetch("https://example.com/x")
        .then(() => "sent")
        .catch((e: Error) => e.message),
    );
  expect(await outside()).toContain("Blocked");
  // Its own API still works.
  expect(await a.evaluate(() => fetch("/api/health").then((r) => r.status))).toBe(200);

  await a.evaluate(() => {
    const f = document.createElement("iframe");
    f.src = "https://www.youtube-nocookie.com/embed/x";
    f.id = "sneaky";
    document.body.appendChild(f);
  });
  await expect(a.locator("#sneaky")).toHaveCount(0);

  // Back in the app, the rule lifts.
  await a.getByRole("button", { name: "Exit" }).click();
  await expect(a).toHaveURL(/\/us/);
  expect(await outside()).not.toContain("Blocked");
});
