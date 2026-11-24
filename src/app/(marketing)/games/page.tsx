import type { Metadata } from "next";
import Image from "next/image";
import Link from "@/components/ui/link";
import { PublicPage, Section, QA, JoinCta } from "@/components/public/public-page";
import { JsonLd } from "@/components/public/json-ld";
import { PUBLIC_GAMES } from "@/lib/public-games";
import { siteUrl } from "@/lib/site";
import "@/components/landing/landing.css";

const TITLE = "Games for couples to play together, apart or side by side";
const DESCRIPTION =
  "Thirteen two-player games for couples, plus a daily word puzzle: Oware, Draughts, Four Up, Draw and guess, Trivia duel, Would you rather and more. Play live or turn by turn, free, in your browser.";

export const metadata: Metadata = {
  title: { absolute: "Games for couples: 13 two-player games to play online | Clink" },
  description: DESCRIPTION,
  robots: { index: true, follow: true },
  alternates: { canonical: "/games" },
  openGraph: {
    title: "Games for couples on Clink",
    description: DESCRIPTION,
    url: "/games",
    type: "website",
    siteName: "Clink",
    locale: "en_GB",
  },
  twitter: {
    card: "summary_large_image",
    title: "Games for couples on Clink",
    description: DESCRIPTION,
  },
};

const FAQ = [
  {
    q: "What games can couples play online together?",
    a: "On Clink you can play thirteen two-player games: How well do you know me, Draw and guess, Trivia duel, Would you rather, Word game, Story builder, Rock paper scissors, Snap challenge, Zoom guess, Photo memory, Oware, Four Up and Draughts, plus a daily word ladder you both solve.",
  },
  {
    q: "What are good games for long distance couples?",
    a: "Live games such as Draw and guess, Trivia duel and How well do you know me suit a video call. Turn-by-turn games such as Oware, Draughts, Four Up, Word game and Story builder suit different time zones, because each of you moves whenever you're free.",
  },
  {
    q: "Do we need to be online at the same time?",
    a: "Only for the live games. The turn-by-turn games can run over hours or days, and Clink tells your partner when it's their move.",
  },
  {
    q: "Are the games free?",
    a: "Yes. Every game on Clink is free to play.",
  },
];

export default function GamesPage() {
  const live = PUBLIC_GAMES.filter((g) => g.mode === "Live");
  const slow = PUBLIC_GAMES.filter((g) => g.mode !== "Live");
  return (
    <PublicPage
      wide
      trail={[{ name: "Games", path: "/games" }]}
      eyebrow="Games for two"
      title={TITLE}
      lede="Every game on Clink is made for exactly two people. Play live on a call, or take a turn whenever you're free and let the game wait for the other person. All of them are free."
    >
      <GameGrid title="Play live, at the same time" games={live} id="live" />
      <GameGrid title="Turn by turn and daily, whenever you're free" games={slow} id="turns" />
      <Section id="faq" title="Questions">
        <QA items={FAQ} />
      </Section>
      <JoinCta line="Make an account, link with your partner and start a game." />
      <JsonLd
        data={{
          "@type": "CollectionPage",
          name: TITLE,
          description: DESCRIPTION,
          url: `${siteUrl()}/games`,
          isPartOf: { "@id": `${siteUrl()}/#site` },
          mainEntity: {
            "@type": "ItemList",
            itemListElement: PUBLIC_GAMES.map((g, i) => ({
              "@type": "ListItem",
              position: i + 1,
              url: `${siteUrl()}/games/${g.slug}`,
              name: g.name,
            })),
          },
        }}
      />
      <JsonLd
        data={{
          "@type": "FAQPage",
          mainEntity: FAQ.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }}
      />
    </PublicPage>
  );
}

function GameGrid({ title, games, id }: { title: string; games: typeof PUBLIC_GAMES; id: string }) {
  return (
    <section aria-labelledby={`${id}-h`} className="flex flex-col gap-5">
      <h2 id={`${id}-h`} className="display m-0 text-2xl leading-tight md:text-3xl">
        {title}
      </h2>
      <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3">
        {games.map((g) => (
          <li key={g.slug}>
            <Link
              href={`/games/${g.slug}`}
              className="press border-line bg-s1 hover:border-line-strong rounded-card text-text hover:text-text flex h-full items-start gap-4 border p-4"
            >
              <Image
                src={`/art/${g.art}.webp`}
                alt=""
                width={56}
                height={56}
                className="flex-none"
              />
              <span className="flex min-w-0 flex-col gap-1">
                <span className="text-base font-bold">{g.name}</span>
                <span className="text-faint text-xs font-medium">
                  {g.mode} · {g.length}
                </span>
                <span className="text-muted line-clamp-3 text-sm leading-snug">{g.summary}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
