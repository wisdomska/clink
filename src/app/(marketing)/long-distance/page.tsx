import type { Metadata } from "next";
import Link from "@/components/ui/link";
import { PublicPage, Section, QA, JoinCta } from "@/components/public/public-page";
import { JsonLd } from "@/components/public/json-ld";
import { siteUrl } from "@/lib/site";
import "@/components/landing/landing.css";

const DESCRIPTION =
  "Clink is a free app for long distance couples: one-tap clinks, video calls, two-player games, letters that open later, countdowns and both your local times side by side.";

export const metadata: Metadata = {
  title: { absolute: "An app for long distance couples | Clink" },
  description: DESCRIPTION,
  robots: { index: true, follow: true },
  alternates: { canonical: "/long-distance" },
  openGraph: {
    title: "Clink: an app for long distance couples",
    description: DESCRIPTION,
    url: "/long-distance",
    type: "website",
    siteName: "Clink",
    locale: "en_GB",
  },
  twitter: {
    card: "summary_large_image",
    title: "Clink: an app for long distance couples",
    description: DESCRIPTION,
  },
};

const PROBLEMS = [
  {
    id: "time",
    title: "When it's 7am for Ama in Accra and 2am for Theo in New York",
    body: [
      "Clink shows both your local times and weather side by side, so you always know whether they're asleep.",
      "Voice notes, scheduled messages and turn-by-turn games mean you don't have to be awake at the same time to be together.",
    ],
  },
  {
    id: "small",
    title: "When a long message is too much and nothing feels like too little",
    body: [
      "Send a clink: one tap that reaches your partner straight away, wherever they are. It's the smallest way to say you're thinking of them.",
    ],
  },
  {
    id: "together",
    title: "When calls turn into status updates",
    body: [
      "Do something together instead: thirteen games made for two, a daily word puzzle you both solve, or watching YouTube and listening on Spotify or Apple Music together, in sync.",
      "Voice and video calls are built in, with no phone number needed.",
    ],
  },
  {
    id: "waiting",
    title: "When the next visit feels far away",
    body: [
      "Count down to it together, plan date nights on a shared calendar, and write letters or seal time capsules that only open on a date you choose.",
    ],
  },
  {
    id: "memories",
    title: "When you want to remember the good bits",
    body: [
      "Keep your favourite photos on a shared memory wall, and get On this day memories from your time together.",
    ],
  },
];

const FAQ = [
  {
    q: "What is the best app for long distance couples?",
    a: "Look for one made for exactly two people that covers calls, small daily signals, shared activities and planning the next visit. Clink does all of these in one free app that runs in the browser and installs to your home screen.",
  },
  {
    q: "Is Clink free?",
    a: "Yes. Clink is free to use.",
  },
  {
    q: "Do we both need Clink?",
    a: "Yes. You each make an account and link with an invite code. One account links to exactly one person.",
  },
  {
    q: "Does it work if we use different devices?",
    a: "Yes. Clink runs in Safari, Chrome and other modern browsers on iPhone, Android, tablets and computers.",
  },
];

export default function LongDistancePage() {
  return (
    <PublicPage
      trail={[{ name: "Long distance", path: "/long-distance" }]}
      eyebrow="For long distance couples"
      title="Two people, two time zones, one app"
      lede="Clink is a private app for couples, built around the hard parts of long distance: time zones, quiet days, the wait between visits, and calls that run out of things to say."
    >
      {PROBLEMS.map((p) => (
        <Section key={p.id} id={p.id} title={p.title}>
          {p.body.map((b) => (
            <p key={b} className="m-0">
              {b}
            </p>
          ))}
        </Section>
      ))}
      <Section id="read" title="Ideas for long distance">
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          <li>
            <Link
              href="/guides/long-distance-date-ideas"
              className="text-text font-medium underline"
            >
              40 long distance date ideas
            </Link>
          </li>
          <li>
            <Link
              href="/guides/long-distance-relationship-tips"
              className="text-text font-medium underline"
            >
              Long distance relationship tips
            </Link>
          </li>
          <li>
            <Link
              href="/guides/games-to-play-on-video-call"
              className="text-text font-medium underline"
            >
              Games to play on a video call
            </Link>
          </li>
          <li>
            <Link href="/games" className="text-text font-medium underline">
              All thirteen games for couples
            </Link>
          </li>
        </ul>
      </Section>
      <Section id="faq" title="Questions">
        <QA items={FAQ} />
      </Section>
      <JoinCta line="Link with your partner in a minute. It's free." />
      <JsonLd
        data={{
          "@type": "WebPage",
          name: "An app for long distance couples",
          description: DESCRIPTION,
          url: `${siteUrl()}/long-distance`,
          isPartOf: { "@id": `${siteUrl()}/#site` },
          about: { "@id": `${siteUrl()}/#app` },
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
