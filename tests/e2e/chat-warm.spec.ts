import { test, expect } from "./fixtures";

// Us quietly fetches the newest messages once it settles, so Chat opens onto them.
test("Chat opens onto its messages at once after Us has settled", async ({ couple }) => {
  test.setTimeout(90_000);
  const { a, b } = couple;
  await a.goto("/chat");
  await a.getByLabel("Message Theo").fill("kelewele tonight?");
  await a.getByRole("button", { name: "Send" }).click();
  await expect(a.getByText(/^Sent|^Delivered|^Read/).last()).toBeVisible({ timeout: 8000 });

  // Theo opens Us; the messages arrive in the background.
  const warmed = b.waitForRequest(
    (r) => /\/rest\/v1\/messages\?select=\*&couple_id=/.test(r.url()),
    {
      timeout: 15000,
    },
  );
  await b.goto("/us");
  await (await warmed).response();

  // Now hold the database back for 8 s: the chat still opens straight onto them.
  await b.route("**/rest/v1/**", async (route) => {
    await new Promise((r) => setTimeout(r, 8000));
    await route.continue().catch(() => undefined);
  });
  await b.locator('nav a[href="/chat"]:visible').first().click();
  await expect(b.getByText("kelewele tonight?")).toBeVisible({ timeout: 4000 });
  await b.unrouteAll({ behavior: "ignoreErrors" });
});
