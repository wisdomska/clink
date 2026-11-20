import type { MetadataRoute } from "next";
import { indexable, PRIVATE_PATHS, abs } from "@/lib/seo";

/**
 * Search engines and AI assistants may read the public pages (home, safety,
 * privacy, terms); the app itself is private and stays out. Previews and
 * local runs are closed to everyone.
 */
export default function robots(): MetadataRoute.Robots {
  if (!indexable()) return { rules: [{ userAgent: "*", disallow: "/" }] };
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/safety", "/privacy", "/terms", "/llms.txt"],
        disallow: PRIVATE_PATHS,
      },
    ],
    sitemap: abs("/sitemap.xml"),
    host: abs("/"),
  };
}
