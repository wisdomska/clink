import type { Metadata } from "next";
import Link from "@/components/ui/link";
import { PublicPage, Section, JoinCta } from "@/components/public/public-page";
import { JsonLd } from "@/components/public/json-ld";
import { siteUrl } from "@/lib/site";
import "@/components/landing/landing.css";

const DESCRIPTION =
  "What Clink is and the rules it's built on: made for exactly two people, private by design, adults only, free, and no selling data.";

export const metadata: Metadata = {
  title: "About Clink",
  description: DESCRIPTION,
  robots: { index: true, follow: true },
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About Clink",
    description: DESCRIPTION,
    url: "/about",
    type: "website",
    siteName: "Clink",
    locale: "en_GB",
  },
  twitter: { card: "summary_large_image", title: "About Clink", description: DESCRIPTION },
};

const RULES = [
  {
    title: "Made for exactly two",
    text: "One account links to exactly one person. There's no feed, no followers, no browsing and no strangers.",
  },
  {
    title: "Private by design",
    text: "Your chats are between you two. An admin can open a couple's chat only for safety or legal reasons, must record why, and every access is logged. After Dark content is never available to the team.",
  },
  {
    title: "Easy to leave",
    text: "Either partner can unlink or block at any time. The other gets a short, neutral notice and private media is wiped for both within an hour.",
  },
  {
    title: "Adults only",
    text: "Clink is for people aged 18 and over, with zero tolerance for anything involving minors.",
  },
  {
    title: "Free, and your data isn't for sale",
    text: "Clink is free. It doesn't sell data, doesn't do advertising tracking and has no session replay. You can download your data or delete your account at any time.",
  },
  {
    title: "No app store needed",
    text: "Clink runs in the browser on any device and installs to your home screen like an app.",
  },
];

export default function AboutPage() {
  return (
    <PublicPage
      trail={[{ name: "About", path: "/about" }]}
      eyebrow="About"
      title="Clink is an app for two people"
      lede="Clink gives couples one private place for the whole relationship: calls, chat, games, letters, date plans and memories. It was made with long distance couples in mind, for the gaps a group chat and a video call don't fill."
    >
      <Section id="rules" title="What Clink is built on">
        <dl className="m-0 flex flex-col gap-5">
          {RULES.map((r) => (
            <div key={r.title} className="flex flex-col gap-1.5">
              <dt className="text-text text-base font-bold">{r.title}</dt>
              <dd className="text-muted m-0 text-base leading-[1.6]">{r.text}</dd>
            </div>
          ))}
        </dl>
      </Section>
      <Section id="more" title="Read more">
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          <li>
            <Link href="/privacy" className="text-text font-medium underline">
              Privacy
            </Link>
          </li>
          <li>
            <Link href="/safety" className="text-text font-medium underline">
              Help and safety
            </Link>
          </li>
          <li>
            <Link href="/faq" className="text-text font-medium underline">
              FAQ
            </Link>
          </li>
          <li>
            <Link href="/terms" className="text-text font-medium underline">
              Terms of use
            </Link>
          </li>
        </ul>
      </Section>
      <JoinCta line="Try it with your partner. It's free." />
      <JsonLd
        data={{
          "@type": "AboutPage",
          name: "About Clink",
          description: DESCRIPTION,
          url: `${siteUrl()}/about`,
          isPartOf: { "@id": `${siteUrl()}/#site` },
          about: { "@id": `${siteUrl()}/#org` },
        }}
      />
    </PublicPage>
  );
}
