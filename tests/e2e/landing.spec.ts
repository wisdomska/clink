import { test, expect } from "@playwright/test";
import { expectNoHorizontalScroll } from "./no-horizontal-scroll";

// The public landing page: headline, calls to action, live clocks, the clink
// demo, FAQ disclosures and legal links. No account needed.
test.describe("landing", () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.setFixedTime(new Date("2026-11-13T21:14:00Z"));
    await page.goto("/");
  });

  test("hero, clocks and calls to action", async ({ page }) => {
    await expect(
      page.getByRole("heading", { level: 1, name: "Two cities. One clink." }),
    ).toBeVisible();
    const main = page.getByRole("main");
    await expect(main.getByRole("link", { name: "Get started" }).first()).toHaveAttribute(
      "href",
      "/signup",
    );
    await expect(main.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/login");
    // Lagos is an hour ahead of London in November.
    const scene = page.getByRole("figure");
    await expect(scene).toContainText("22:14");
    await expect(scene).toContainText("21:14");
    await expectNoHorizontalScroll(page);
  });

  test("send a clink in the demo", async ({ page }) => {
    const button = page.getByRole("button", { name: "Tap to clink to Theo" });
    await button.scrollIntoViewIfNeeded();
    await expect(page.getByText("0 clinks sent")).toBeVisible();
    await button.click();
    await expect(page.getByText("1 clink sent")).toBeVisible();
    await button.click();
    await button.click();
    await expect(page.getByText("3 clinks sent")).toBeVisible();
    await expect(page.getByText("Theo sent one back")).toBeVisible();
  });

  test("FAQ opens and closes", async ({ page }) => {
    const q = page.getByText("Does my partner need an account too?");
    const a = page.getByText(/One account links to exactly one person/);
    await q.scrollIntoViewIfNeeded();
    await expect(a).toBeHidden();
    await q.click();
    await expect(a).toBeVisible();
    await q.click();
    await expect(a).toBeHidden();
  });

  test("legal links and invite code", async ({ page }) => {
    const legal = page.getByRole("navigation", { name: "Legal" });
    await expect(legal.getByRole("link", { name: "Privacy" })).toHaveAttribute("href", "/privacy");
    await expect(legal.getByRole("link", { name: "Terms" })).toHaveAttribute("href", "/terms");
    await expect(legal.getByRole("link", { name: "Help and safety" })).toHaveAttribute(
      "href",
      "/safety",
    );
    await expect(page.getByRole("link", { name: "Got an invite code?" })).toHaveAttribute(
      "href",
      "/signup?code=1",
    );
  });
});
