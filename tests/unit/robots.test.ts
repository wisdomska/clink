import { describe, it, expect, afterEach, vi } from "vitest";
import robots from "@/app/robots";
import { PRIVATE_PATHS } from "@/lib/seo";

describe("robots.txt", () => {
  afterEach(() => vi.unstubAllEnvs());
  it("welcomes search engines and AI assistants to the public pages only", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    const r = robots();
    const rules = Array.isArray(r.rules) ? r.rules : [r.rules];
    const named = rules.flatMap((x) => [x.userAgent].flat());
    for (const bot of [
      "*",
      "Googlebot",
      "Bingbot",
      "GPTBot",
      "OAI-SearchBot",
      "ClaudeBot",
      "PerplexityBot",
    ])
      expect(named).toContain(bot);
    // Every group keeps the app private: a named group replaces "*" for that bot.
    for (const x of rules) {
      expect(x.disallow).toEqual(PRIVATE_PATHS);
      expect([x.allow].flat()).toContain("/");
    }
    expect(r.sitemap).toMatch(/\/sitemap\.xml$/);
  });
  it("closes previews and local runs", () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("SEO_INDEX", "");
    expect(robots().rules).toEqual([{ userAgent: "*", disallow: "/" }]);
  });
});
