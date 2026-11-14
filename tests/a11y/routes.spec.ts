import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { test, expect } from "../e2e/fixtures";

const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

async function scan(page: Page, route: string) {
  await page.goto(route);
  await page.waitForTimeout(300);
  // Measure contrast on the settled screen, not mid-fade: wait for every
  // finite entrance animation (staggered rises, fades) to finish.
  await page.waitForFunction(
    () =>
      document
        .getAnimations()
        .filter((a) => a.effect?.getComputedTiming().iterations !== Infinity)
        .every((a) => a.playState !== "running"),
    null,
    { timeout: 10_000 },
  );
  const r = await new AxeBuilder({ page }).withTags(TAGS).exclude(".grain").analyze();
  const bad = r.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  const report = bad
    .map(
      (v) =>
        `${v.id} (${v.impact}): ${v.help}\n  ${v.nodes
          .slice(0, 3)
          .map((n) => n.target.join(" "))
          .join("\n  ")}`,
    )
    .join("\n");
  expect(bad, `${route}\n${report}`).toEqual([]);
}

const PUBLIC = ["/", "/login", "/signup", "/privacy", "/terms", "/safety", "/help", "/offline"];
const APP = [
  "/us",
  "/us/countdowns",
  "/chat",
  "/play",
  "/plans",
  "/plans/roulette",
  "/plans/challenges/new",
  "/plans/watch",
  "/plans/listen",
  "/keep",
  "/keep/timeline",
  "/settings",
  "/install",
];
const DARK = [
  "/dark",
  "/dark/home",
  "/dark/consent",
  "/dark/decks/Flirty",
  "/dark/match",
  "/dark/wheel",
  "/dark/vault",
  "/dark/request",
];

test.describe("axe-core: zero serious or critical issues on every route", () => {
  test("public routes", async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    for (const r of PUBLIC) await scan(page, r);
    await ctx.close();
  });
  test("signed-in app routes", async ({ couple }) => {
    for (const r of APP) await scan(couple.a, r);
  });
  test("After Dark routes", async ({ couple }) => {
    const { a, b } = couple;
    await a.request.post("/api/dark/setup", { data: { pin: "2611", tiers: ["Flirty"] } });
    await b.request.post("/api/dark/setup", { data: { pin: "2611", tiers: ["Flirty"] } });
    await a.request.post("/api/dark/lock");
    await scan(a, "/dark");
    await a.request.post("/api/dark/unlock", { data: { pin: "2611" } });
    for (const r of DARK.slice(1)) await scan(a, r);
  });
});
