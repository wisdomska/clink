import { renderOg, OG_SIZE } from "@/lib/og/render";
import { GUIDES, guideBySlug } from "@/lib/guides";

export const alt = "A guide for couples from Clink";
export const size = OG_SIZE;
export const contentType = "image/png";

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const g = guideBySlug((await params).slug)!;
  return renderOg({ eyebrow: "Guide", title: g.title, art: g.art });
}
