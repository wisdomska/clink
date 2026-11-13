import { test as base, expect, type Page, type BrowserContext } from "@playwright/test";
import { makeUser, signIn, type TestUser } from "./helpers";

export interface Couple {
  a: Page;
  b: Page;
  ctxA: BrowserContext;
  ctxB: BrowserContext;
  nia: TestUser;
  theo: TestUser;
}

/** A fresh linked couple (Nia in London, Theo in Accra), each in their own browser context. */
export const test = base.extend<{ couple: Couple }>({
  couple: async ({ browser }, use, info) => {
    const p = info.project.use;
    const opts = { viewport: p.viewport, hasTouch: p.hasTouch, isMobile: p.isMobile, userAgent: p.userAgent, deviceScaleFactor: p.deviceScaleFactor, permissions: ["clipboard-read", "clipboard-write"] };
    const ctxA = await browser.newContext(opts);
    const ctxB = await browser.newContext(opts);
    const a = await ctxA.newPage();
    const b = await ctxB.newPage();
    const nia = await makeUser("Nia");
    const theo = await makeUser("Theo", { city: "Accra", timezone: "Africa/Accra" });
    await signIn(a, nia, "/link");
    await signIn(b, theo, "/link");
    const { code } = await (await a.request.post("/api/invites")).json();
    const acc = await b.request.post("/api/invites/accept", { data: { code } });
    expect(acc.ok()).toBeTruthy();
    await use({ a, b, ctxA, ctxB, nia, theo });
    await ctxA.close();
    await ctxB.close();
  },
});
export { expect };
