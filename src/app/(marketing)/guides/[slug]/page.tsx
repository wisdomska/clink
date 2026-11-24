import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import Link from "@/components/ui/link";
import { PublicPage, Section, QA, JoinCta } from "@/components/public/public-page";
import { JsonLd } from "@/components/public/json-ld";
import { GUIDES, guideBySlug, type GuideBlock } from "@/lib/guides";
import { siteUrl } from "@/lib/site";
import "@/components/landing/landing.css";

export const dynamicParams = false;
export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const g = guideBySlug((await params).slug);
  if (!g) return {};
  return {
    title: { absolute: `${g.title} | Clink` },
    description: g.description,
    robots: { index: true, follow: true },
    alternates: { canonical: `/guides/${g.slug}` },
    openGraph: {
      title: g.title,
      description: g.description,
      url: `/guides/${g.slug}`,
      type: "article",
      siteName: "Clink",
      locale: "en_GB",
      publishedTime: g.published,
      modifiedTime: g.updated,
    },
    twitter: { card: "summary_large_image", title: g.title, description: g.description },
  };
}

function Block({ b }: { b: GuideBlock }) {
  if (b.kind === "p") return <p className="m-0">{b.text}</p>;
  if (b.kind === "tip")
    return (
      <p className="border-accent/40 bg-accent/10 text-text rounded-card m-0 border p-4">
        <span className="text-accent font-bold">Tip: </span>
        {b.text}
      </p>
    );
  const List = b.ordered ? "ol" : "ul";
  return (
    <List
      className={`marker:text-accent m-0 flex flex-col gap-3 pl-5 ${b.ordered ? "list-decimal" : "list-disc"}`}
    >
      {b.items.map((it) => (
        <li key={(it.title ?? "") + it.text} className="pl-1">
          {it.title && <strong className="text-text">{it.title}. </strong>}
          {it.text}
        </li>
      ))}
    </List>
  );
}

const fmt = (d: string) =>
  new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

export default async function GuidePage({ params }: Props) {
  const g = guideBySlug((await params).slug);
  if (!g) notFound();
  const url = `${siteUrl()}/guides/${g.slug}`;
  const more = GUIDES.filter((o) => o.slug !== g.slug);
  return (
    <PublicPage
      trail={[
        { name: "Guides", path: "/guides" },
        { name: g.title, path: `/guides/${g.slug}` },
      ]}
      eyebrow={`Guide · ${g.minutes} minute read`}
      title={g.title}
      lede={g.answer}
    >
      <div className="text-faint -mt-4 flex items-center gap-3 text-sm">
        <Image src={`/art/${g.art}.webp`} alt="" width={40} height={40} priority />
        <span>
          By the Clink team · Updated <time dateTime={g.updated}>{fmt(g.updated)}</time>
        </span>
      </div>

      <nav aria-label="In this guide" className="border-line rounded-card border p-4">
        <p className="text-text m-0 mb-2 text-sm font-bold">In this guide</p>
        <ul className="m-0 flex list-none flex-col gap-1 p-0 text-sm">
          {g.sections.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="text-muted hover:text-text">
                {s.title}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {g.sections.map((s) => (
        <Section key={s.id} id={s.id} title={s.title}>
          {s.blocks.map((b, i) => (
            <Block key={i} b={b} />
          ))}
        </Section>
      ))}

      <Section id="faq" title="Questions">
        <QA items={g.faq} />
      </Section>

      <JoinCta line="Calls, games, letters and date plans for two. Free." />

      <Section id="more" title="More guides">
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {more.map((o) => (
            <li key={o.slug}>
              <Link href={`/guides/${o.slug}`} className="text-text font-medium underline">
                {o.title}
              </Link>
            </li>
          ))}
          <li>
            <Link href="/games" className="text-accent font-medium">
              Games for couples
            </Link>
          </li>
        </ul>
      </Section>

      <JsonLd
        data={{
          "@type": "Article",
          "@id": `${url}#article`,
          headline: g.title,
          description: g.description,
          abstract: g.answer,
          url,
          inLanguage: "en-GB",
          datePublished: g.published,
          dateModified: g.updated,
          timeRequired: `PT${g.minutes}M`,
          author: { "@id": `${siteUrl()}/#org` },
          publisher: { "@id": `${siteUrl()}/#org` },
          isPartOf: { "@id": `${siteUrl()}/#site` },
          mainEntityOfPage: url,
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
