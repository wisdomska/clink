import { renderOg, OG_SIZE } from "@/lib/og/render";
import { PUBLIC_GAMES, gameBySlug } from "@/lib/public-games";

export const alt = "A game for two on Clink";
export const size = OG_SIZE;
export const contentType = "image/png";

export function generateStaticParams() {
  return PUBLIC_GAMES.map((g) => ({ slug: g.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const g = gameBySlug((await params).slug)!;
  return renderOg({
    eyebrow: `${g.mode} game for two`,
    title: g.name,
    body: g.bestFor,
    art: g.art,
  });
}
