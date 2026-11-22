import { test, expect, type Page } from "@playwright/test";

/**
 * After every deploy to production (.github/workflows/after-deploy.yml): the
 * live site answers, pages hydrate without errors, signed-in screens are
 * guarded, and the files search engines and installed apps need are there.
 * Read-only: no accounts are made and nothing is written.
 */

/** Fails the test on any page error or failed request to the site itself. */
function watch(page: Page) {
  const problems: string[] = [];
  const origin = new URL(test.info().project.use.baseURL!).origin;
  page.on("pageerror", (e) => problems.push(`page error: ${e.message}`));
  page.on("console", (m) => {
    if (
      m.type() === "error" &&
      !/favicon|Failed to load resource.*(sentry|posthog)/i.test(m.text())
    )
      problems.push(`console: ${m.text()}`);
  });
  page.on("response", (r) => {
    if (r.url().startsWith(origin) && r.status() >= 500) problems.push(`${r.status()} ${r.url()}`);
  });
  page.on("requestfailed", (r) => {
    if (r.url().startsWith(origin) && !/net::ERR_ABORTED/.test(r.failure()?.errorText ?? ""))
      problems.push(`failed: ${r.url()} ${r.failure()?.errorText}`);
  });
  return problems;
}

const hydrated = (page: Page) =>
  page.waitForFunction(() => document.documentElement.dataset.hydrated === "true", null, {
    timeout: 20000,
  });

test("health: up, database answering", async ({ request }) => {
  const r = await request.get("/api/health");
  expect(r.ok()).toBeTruthy();
  expect(await r.json()).toMatchObject({ ok: true, db: "ok" });
});

test("home page loads, hydrates and shows the hero, with its security policy", async ({ page }) => {
  const problems = watch(page);
  const r = await page.goto("/");
  expect(r?.status()).toBe(200);
  expect(r?.headers()["content-security-policy"]).toContain("script-src");
  await hydrated(page);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.waitForTimeout(1500);
  expect(problems).toEqual([]);
});

test("sign-in page works", async ({ page }) => {
  const problems = watch(page);
  await page.goto("/login");
  await hydrated(page);
  await expect(page.getByLabel("Email")).toBeVisible();
  expect(problems).toEqual([]);
});

test("signed-in screens send you to sign in first", async ({ page }) => {
  for (const path of ["/us", "/chat", "/play", "/dark"]) {
    await page.goto(path);
    await expect(page).toHaveURL(new RegExp(`/login\\?next=${encodeURIComponent(path)}`));
  }
});

test("files for search engines, AI assistants and the installed app", async ({ request }) => {
  for (const [path, type] of [
    ["/robots.txt", "text/plain"],
    ["/sitemap.xml", "xml"],
    ["/llms.txt", "text/plain"],
    ["/manifest.webmanifest", "json"],
    ["/sw.js", "javascript"],
  ] as const) {
    const r = await request.get(path);
    expect(r.status(), path).toBe(200);
    expect(r.headers()["content-type"], path).toContain(type);
  }
  // The share image, at whatever versioned address the home page points to.
  const html = await (await request.get("/")).text();
  const og = html.match(/<meta property="og:image" content="([^"]+)"/)?.[1];
  expect(og, "og:image").toBeTruthy();
  const img = await request.get(og!.replace(/&amp;/g, "&"));
  expect(img.status(), og).toBe(200);
  expect(img.headers()["content-type"]).toContain("image/png");
});
