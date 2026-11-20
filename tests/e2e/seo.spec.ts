import { test, expect } from "@playwright/test";

// What search engines and AI assistants can read: the public pages only.
test("robots, sitemap and llms.txt describe the public site and keep the app private", async ({
  request,
}) => {
  const robots = await (await request.get("/robots.txt")).text();
  if (process.env.SEO_INDEX === "1") {
    for (const p of ["/api/", "/admin", "/dark", "/chat", "/us", "/settings"])
      expect(robots).toContain(`Disallow: ${p}`);
    expect(robots).toContain("Sitemap: ");
  } else {
    // Previews and local runs are closed to crawlers entirely.
    expect(robots).toMatch(/Disallow: \/\s*$/m);
  }

  const sitemap = await (await request.get("/sitemap.xml")).text();
  const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]!).pathname);
  expect(urls.sort()).toEqual(["/", "/privacy", "/safety", "/terms"]);

  const llms = await request.get("/llms.txt");
  expect(llms.headers()["content-type"]).toContain("text/plain");
  const text = await llms.text();
  expect(text.startsWith("# Clink\n")).toBe(true);
  expect(text).toContain("18+");
  expect(text).not.toMatch(/—/); // no em dashes
});
