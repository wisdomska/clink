import type { Metadata } from "next";
import Image from "next/image";
import Link from "@/components/ui/link";
import { PublicPage } from "@/components/public/public-page";
import { JsonLd } from "@/components/public/json-ld";
import { GUIDES } from "@/lib/guides";
import { siteUrl } from "@/lib/site";
import "@/components/landing/landing.css";

const DESCRIPTION =
  "Practical guides for couples, especially long distance: date ideas, games to play on a video call, relationship tips and questions to ask your partner.";

export const metadata: Metadata = {
  title: { absolute: "Guides for couples and long distance relationships | Clink" },
  description: DESCRIPTION,
  robots: { index: true, follow: true },
  alternates: { canonical: "/guides" },
  openGraph: {
    title: "Guides for couples",
    description: DESCRIPTION,
    url: "/guides",
    type: "website",
    siteName: "Clink",
    locale: "en_GB",
  },
  twitter: { card: "summary_large_image", title: "Guides for couples", description: DESCRIPTION },
};

export default function GuidesPage() {
  return (
    <PublicPage
      trail={[{ name: "Guides", path: "/guides" }]}
      eyebrow="Guides"
      title="Guides for couples, near and far"
      lede="Ideas and advice for staying close, written for couples who live in different places. Free to read, no account needed."
    >
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {GUIDES.map((g) => (
          <li key={g.slug}>
            <Link
              href={`/guides/${g.slug}`}
              className="press border-line bg-s1 hover:border-line-strong rounded-card text-text hover:text-text flex items-start gap-4 border p-4"
            >
              <Image
                src={`/art/${g.art}.webp`}
                alt=""
                width={56}
                height={56}
                className="flex-none"
              />
              <span className="flex min-w-0 flex-col gap-1">
                <span className="text-lg leading-snug font-bold">{g.title}</span>
                <span className="text-muted text-sm leading-snug">{g.description}</span>
                <span className="text-faint text-xs">{g.minutes} minute read</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <JsonLd
        data={{
          "@type": "CollectionPage",
          name: "Guides for couples",
          description: DESCRIPTION,
          url: `${siteUrl()}/guides`,
          isPartOf: { "@id": `${siteUrl()}/#site` },
          mainEntity: {
            "@type": "ItemList",
            itemListElement: GUIDES.map((g, i) => ({
              "@type": "ListItem",
              position: i + 1,
              url: `${siteUrl()}/guides/${g.slug}`,
              name: g.title,
            })),
          },
        }}
      />
    </PublicPage>
  );
}
