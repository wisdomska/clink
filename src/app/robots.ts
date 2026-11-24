import type { MetadataRoute } from "next";
import { indexable, PRIVATE_PATHS, SEARCH_AND_AI_BOTS, abs } from "@/lib/seo";

/**
 * Search engines and AI assistants may read the public pages (home, games,
 * guides, FAQ, safety, privacy, terms); the app itself is private and stays out. Previews and
 * local runs are closed to everyone.
 */
export default function robots(): MetadataRoute.Robots {
  if (!indexable()) return { rules: [{ userAgent: "*", disallow: "/" }] };
  const rule = { allow: ["/", "/llms.txt", "/llms-full.txt"], disallow: PRIVATE_PATHS };
  return {
    rules: [
      { userAgent: "*", ...rule },
      // Named so it's clear they're welcome on the public pages: search engines
      // and the assistants that answer questions with them.
      { userAgent: [...SEARCH_AND_AI_BOTS], ...rule },
    ],
    sitemap: abs("/sitemap.xml"),
    host: abs("/"),
  };
}
