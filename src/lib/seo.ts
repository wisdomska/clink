import { siteUrl } from "@/lib/site";
import { PUBLIC_GAMES } from "@/lib/public-games";

/** Only the real site is indexed: previews and local runs ask crawlers to stay out. */
export const indexable = () =>
  process.env.VERCEL_ENV === "production" || process.env.SEO_INDEX === "1";

/** Public pages worth a link in the header (first two) and footer. */
export const EXPLORE = [{ href: "/games", label: "Games" }] as const;

/** The public pages, for the sitemap and llms.txt. Everything else is private. */
export const PUBLIC_PAGES = [
  { path: "/", title: "Clink: Made for two", updated: "2026-11-24", priority: 1 },
  { path: "/games", title: "Games for couples", updated: "2026-11-24", priority: 0.9 },
  ...PUBLIC_GAMES.map((g) => ({
    path: `/games/${g.slug}`,
    title: g.name,
    updated: "2026-11-24",
    priority: 0.7,
  })),
  { path: "/safety", title: "Help and safety", updated: "2026-11-13", priority: 0.6 },
  { path: "/privacy", title: "Your privacy", updated: "2026-11-13", priority: 0.5 },
  { path: "/terms", title: "Terms of use", updated: "2026-11-13", priority: 0.4 },
];

/** Signed-in screens and internals: never crawled. */
export const PRIVATE_PATHS = [
  "/api/",
  "/admin",
  "/dark",
  "/us",
  "/chat",
  "/play",
  "/plans",
  "/keep",
  "/calendar",
  "/search",
  "/settings",
  "/help",
  "/link",
  "/onboarding",
  "/unlock",
  "/account",
  "/archive",
  "/offline",
  "/auth/",
];

/** Crawlers named in robots.txt: search engines and AI answer engines. */
export const SEARCH_AND_AI_BOTS = [
  "Googlebot",
  "Bingbot",
  "Applebot",
  "DuckDuckBot",
  "YandexBot",
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot-Extended",
  "Amazonbot",
  "meta-externalagent",
  "MistralAI-User",
] as const;

/** IndexNow key (public by design: the file at /<key>.txt proves the site is ours). */
export const INDEXNOW_KEY = "4e598bc64cb12147b3bc4a9367980bb2";

export const abs = (path: string) => `${siteUrl()}${path === "/" ? "" : path}`;
