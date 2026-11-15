import { test, expect } from "@playwright/test";
import { makeUser, signIn, twoPartners, admin } from "./helpers";

test.describe("Flow 10.1: sign up, link and first Clink", () => {
  test("partner B links with A's code, both see the linked moment, A's Clink reaches B", async ({
    browser,
  }, info) => {
    const nia = await makeUser("Nia");
    const theo = await makeUser("Theo", { city: "Accra", timezone: "Africa/Accra" });
    const ctxOpts = info.project.use;
    const { a, b, ctxA, ctxB } = await twoPartners(browser, {
      viewport: ctxOpts.viewport,
      hasTouch: ctxOpts.hasTouch,
      isMobile: ctxOpts.isMobile,
      userAgent: ctxOpts.userAgent,
      deviceScaleFactor: ctxOpts.deviceScaleFactor,
    });

    await signIn(a, nia, "/link");
    await expect(a).toHaveURL(/\/link/);
    await expect(a.getByRole("heading", { name: /Link your partner/ })).toBeVisible();
    const codeLabel = await a.getByLabel(/^Your code/).getAttribute("aria-label");
    const code = codeLabel!.replace("Your code ", "").replace(/ /g, "");
    expect(code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);

    await signIn(b, theo, `/link?code=${code}`);
    await expect(b.getByText("Link with Nia?")).toBeVisible();
    await b.getByRole("button", { name: "Link us" }).click();
    await expect(b.getByRole("heading", { name: /linked/ })).toBeVisible();
    await expect(b.getByText("Theo and Nia. Two cities, one Clink.")).toBeVisible();

    // A learns about the link by polling.
    await expect(a.getByRole("heading", { name: /linked/ })).toBeVisible({ timeout: 15_000 });

    // Both on Us; A clinks; B gets the overlay within the realtime budget.
    await b.goto("/us");
    await a.goto("/us");
    await expect(b.getByRole("button", { name: /Send a Clink/ })).toBeVisible();
    await a.waitForTimeout(1500); // both channels subscribed
    const t0 = Date.now();
    await a.getByRole("button", { name: /Send a Clink/ }).click();
    await expect(b.getByText("Nia sent a Clink")).toBeVisible({ timeout: 5_000 });
    info.annotations.push({ type: "clink-latency-ms", description: String(Date.now() - t0) });

    await b.getByRole("button", { name: "Clink back" }).click();
    await expect(a.getByText("Theo clinked back")).toBeVisible({ timeout: 5_000 });

    // Persisted, and the answer counts for the streak.
    await expect
      .poll(
        async () =>
          (await admin.from("clinks").select("id, answered_at").not("answered_at", "is", null)).data
            ?.length ?? 0,
      )
      .toBeGreaterThan(0);
    await ctxA.close();
    await ctxB.close();
  });

  test("a used code cannot be reused and an account links to one partner only", async ({
    browser,
  }) => {
    const a1 = await makeUser("Ama");
    const b1 = await makeUser("Kwesi");
    const c1 = await makeUser("Kofi");
    const { a, b, ctxA, ctxB } = await twoPartners(browser);
    const ctxC = await browser.newContext();
    const c = await ctxC.newPage();
    await signIn(a, a1, "/link");
    await signIn(b, b1, "/link");
    await signIn(c, c1, "/link");
    const { code } = await (await a.request.post("/api/invites")).json();
    expect((await b.request.post("/api/invites/accept", { data: { code } })).status()).toBe(200);
    const reuse = await c.request.post("/api/invites/accept", { data: { code } });
    expect(reuse.status()).toBe(404);
    const again = await a.request.post("/api/invites");
    expect(again.status()).toBe(409);
    await Promise.all([ctxA.close(), ctxB.close(), ctxC.close()]);
  });
});
