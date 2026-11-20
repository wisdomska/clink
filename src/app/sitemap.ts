import type { MetadataRoute } from "next";
import { PUBLIC_PAGES, abs } from "@/lib/seo";

/** The public pages only. */
export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_PAGES.map((p) => ({
    url: abs(p.path),
    lastModified: p.updated,
    changeFrequency: p.path === "/" ? "weekly" : "monthly",
    priority: p.priority,
  }));
}
