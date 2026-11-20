import { siteUrl } from "@/lib/site";

/** Only the real site is indexed: previews and local runs ask crawlers to stay out. */
export const indexable = () =>
  process.env.VERCEL_ENV === "production" || process.env.SEO_INDEX === "1";

/** The public pages, for the sitemap and llms.txt. Everything else is private. */
export const PUBLIC_PAGES = [
  { path: "/", title: "Clink: Made for two", updated: "2026-11-20", priority: 1 },
  { path: "/safety", title: "Help and safety", updated: "2026-11-13", priority: 0.6 },
  { path: "/privacy", title: "Your privacy", updated: "2026-11-13", priority: 0.5 },
  { path: "/terms", title: "Terms of use", updated: "2026-11-13", priority: 0.4 },
] as const;

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

export const abs = (path: string) => `${siteUrl()}${path === "/" ? "" : path}`;
