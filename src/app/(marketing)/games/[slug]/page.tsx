import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import Link from "@/components/ui/link";
import { PublicPage, Section, QA, JoinCta } from "@/components/public/public-page";
import { JsonLd } from "@/components/public/json-ld";
import { PUBLIC_GAMES, gameBySlug } from "@/lib/public-games";
import { siteUrl } from "@/lib/site";
import "@/components/landing/landing.css";

export const dynamicParams = false;
export function generateStaticParams() {
  return PUBLIC_GAMES.map((g) => ({ slug: g.slug }));
}

type Props = { params: Promise<{ slug: string }> };

const isBoard = (slug: string) => ["oware", "four-up", "draughts"].includes(slug);

function headline(name: string, slug: string) {
  if (slug === "daily-word-ladder") return "Daily word ladder: a word puzzle for two";
  if (isBoard(slug)) return `How to play ${name}: rules for two players`;
  return `${name}: a game for couples`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const g = gameBySlug((await params).slug);
  if (!g) return {};
  const title = headline(g.name, g.slug);
  const description =
    g.summary.length > 158 ? `${g.summary.slice(0, 155).trimEnd()}...` : g.summary;
  return {
    title: { absolute: `${title} | Clink` },
    description,
    keywords: g.keywords,
    robots: { index: true, follow: true },
    alternates: { canonical: `/games/${g.slug}` },
    openGraph: {
      title,
      description,
      url: `/games/${g.slug}`,
      type: "article",
      siteName: "Clink",
      locale: "en_GB",
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function GamePage({ params }: Props) {
  const g = gameBySlug((await params).slug);
  if (!g) notFound();
  const url = `${siteUrl()}/games/${g.slug}`;
  const others = PUBLIC_GAMES.filter((o) => o.slug !== g.slug && o.mode === g.mode).slice(0, 3);
  return (
    <PublicPage
      trail={[
        { name: "Games", path: "/games" },
        { name: g.name, path: `/games/${g.slug}` },
      ]}
      eyebrow={`${g.mode} · ${g.length}`}
      title={headline(g.name, g.slug)}
      lede={g.summary}
    >
      <div className="flex items-center gap-4">
        <Image src={`/art/${g.art}.webp`} alt="" width={96} height={96} priority />
        <p className="text-text m-0 text-base">
          <span className="text-faint block text-sm">Best for</span>
          {g.bestFor}
        </p>
      </div>

      <Section id="how-to-play" title={`How to play ${g.name}`}>
        {g.intro && <p className="m-0">{g.intro}</p>}
        <ol className="marker:text-accent m-0 flex list-decimal flex-col gap-3 pl-5">
          {g.steps.map((s) => (
            <li key={s} className="pl-1">
              {s}
            </li>
          ))}
        </ol>
      </Section>

      <Section id="tips" title="Tips">
        <ul className="marker:text-accent m-0 flex list-disc flex-col gap-2 pl-5">
          {g.tips.map((t) => (
            <li key={t} className="pl-1">
              {t}
            </li>
          ))}
        </ul>
      </Section>

      <Section id="faq" title="Questions">
        <QA items={g.faq} />
      </Section>

      <JoinCta line={`Play ${g.name} with your partner on Clink. It's free.`} />

      {others.length > 0 && (
        <Section id="more" title="More games like this">
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {others.map((o) => (
              <li key={o.slug}>
                <Link href={`/games/${o.slug}`} className="text-text font-medium underline">
                  {o.name}
                </Link>
                <span className="text-muted">: {o.summary.split(". ")[0]}.</span>
              </li>
            ))}
            <li>
              <Link href="/games" className="text-accent font-medium">
                All games for couples
              </Link>
            </li>
          </ul>
        </Section>
      )}

      <JsonLd
        data={{
          "@type": "Article",
          "@id": `${url}#article`,
          headline: headline(g.name, g.slug),
          description: g.summary,
          url,
          inLanguage: "en-GB",
          datePublished: "2026-11-24",
          dateModified: "2026-11-24",
          author: { "@id": `${siteUrl()}/#org` },
          publisher: { "@id": `${siteUrl()}/#org` },
          isPartOf: { "@id": `${siteUrl()}/#site` },
          about: {
            "@type": "Game",
            name: g.name,
            description: g.summary,
            numberOfPlayers: { "@type": "QuantitativeValue", value: 2 },
            audience: { "@type": "PeopleAudience", suggestedMinAge: 18 },
          },
        }}
      />
      <JsonLd
        data={{
          "@type": "FAQPage",
          mainEntity: g.faq.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }}
      />
    </PublicPage>
  );
}
