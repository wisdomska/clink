import type { Metadata } from "next";
import { PublicPage, Section, QA, JoinCta } from "@/components/public/public-page";
import { JsonLd } from "@/components/public/json-ld";
import { FAQS } from "@/components/landing/faq";
import "@/components/landing/landing.css";

const DESCRIPTION =
  "Answers about Clink, the app for couples: who it's for, how linking works, cost, iPhone and Android, games, privacy, After Dark and what happens if you break up.";

export const metadata: Metadata = {
  title: { absolute: "Clink FAQ: questions about the app for couples" },
  description: DESCRIPTION,
  robots: { index: true, follow: true },
  alternates: { canonical: "/faq" },
  openGraph: {
    title: "Clink FAQ",
    description: DESCRIPTION,
    url: "/faq",
    type: "website",
    siteName: "Clink",
    locale: "en_GB",
  },
  twitter: { card: "summary_large_image", title: "Clink FAQ", description: DESCRIPTION },
};

const MORE = [
  {
    group: "Getting started",
    items: [
      {
        q: "How do I link with my partner?",
        a: "Sign up, then either send your partner your invite code or enter theirs. Once one of you enters the other's code, your accounts are linked.",
      },
      {
        q: "How do I get notifications on iPhone?",
        a: "Add Clink to your home screen from Safari's share menu, open it from there, and allow notifications when asked. iPhones only send web app notifications to apps added to the home screen.",
      },
      {
        q: "Can I use Clink on a computer?",
        a: "Yes. Clink works in any modern browser on any device: computers and tablets as well as iPhone and Android.",
      },
    ],
  },
  {
    group: "Games and features",
    items: [
      {
        q: "What games are on Clink?",
        a: "Thirteen two-player games: How well do you know me, Draw and guess, Trivia duel, Would you rather, Word game, Story builder, Rock paper scissors, Snap challenge, Zoom guess, Photo memory, Oware, Four Up and Draughts, plus a daily word ladder.",
      },
      {
        q: "Can we play if we're never online at the same time?",
        a: "Yes. Word game, Story builder, Oware, Four Up and Draughts are turn by turn, and your partner gets a notification when it's their move.",
      },
      {
        q: "Can we watch things together?",
        a: "Yes. You can watch YouTube and listen on Spotify or Apple Music together from Plans.",
      },
      {
        q: "Are calls free?",
        a: "Yes. Voice and video calls are built in and free, with no phone number needed.",
      },
    ],
  },
  {
    group: "Privacy and safety",
    items: [
      {
        q: "Can anyone at Clink read our messages?",
        a: "Your chats are private between you two. An admin can open a couple's chat only for safety or legal reasons, such as investigating a report, must record why, and every access is logged. After Dark content is never available to the team.",
      },
      {
        q: "How do I delete my account?",
        a: "In Settings. You can also download your data there first.",
      },
    ],
  },
];

const ALL = [...FAQS, ...MORE.flatMap((g) => g.items)];

export default function FaqPage() {
  return (
    <PublicPage
      trail={[{ name: "FAQ", path: "/faq" }]}
      eyebrow="FAQ"
      title="Questions about Clink"
      lede="Clink is a private app for two adults in a relationship, especially long distance. Here's how it works."
    >
      <Section id="basics" title="The basics">
        <QA items={FAQS} />
      </Section>
      {MORE.map((g) => (
        <Section key={g.group} id={g.group.toLowerCase().replace(/\W+/g, "-")} title={g.group}>
          <QA items={g.items} />
        </Section>
      ))}
      <JoinCta line="Still deciding? It's free, and takes a minute to set up." />
      <JsonLd
        data={{
          "@type": "FAQPage",
          mainEntity: ALL.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }}
      />
    </PublicPage>
  );
}
