import { test, expect } from "./fixtures";

// Reopening Us shows the cards' last answers straight away, while fresh data loads.
test("Us shows its saved cards at once on reopen, and forgets them on sign-out", async ({
  couple,
}) => {
  test.setTimeout(90_000);
  const { a, b } = couple;
  await a.goto("/us");
  await a.getByRole("radio", { name: "Missing you" }).click();
  await b.goto("/us");
  await expect(b.getByText(/Nia is missing you/)).toBeVisible({ timeout: 10000 });

  // Saved on the device: the small cards only, never memories.
  await expect
    .poll(() =>
      b.evaluate(() =>
        Object.keys(localStorage)
          .filter((k) => k.startsWith("clink-q:"))
          .map((k) => localStorage.getItem(k) ?? "")
          .join(""),
      ),
    )
    .toContain("moods");
  const saved = await b.evaluate(() =>
    Object.keys(localStorage)
      .filter((k) => k.startsWith("clink-q:"))
      .map((k) => localStorage.getItem(k) ?? "")
      .join(""),
  );
  expect(saved).not.toContain("on-this-day");

  // Reopen with the database held back for 8 s: the mood is there long before.
  await b.route("**/rest/v1/**", async (route) => {
    await new Promise((r) => setTimeout(r, 8000));
    await route.continue().catch(() => undefined);
  });
  await b.reload();
  await expect(b.getByText(/Nia is missing you/)).toBeVisible({ timeout: 3000 });
  await b.unrouteAll({ behavior: "ignoreErrors" });

  // Signing out clears it.
  await b.goto("/settings?tab=account");
  await b.getByRole("button", { name: "Sign out", exact: true }).click();
  await b.waitForURL((u) => !u.pathname.startsWith("/settings"), { timeout: 15000 });
  const left = await b.evaluate(() =>
    Object.keys(localStorage).filter((k) => k.startsWith("clink-q:")),
  );
  expect(left).toEqual([]);
});
