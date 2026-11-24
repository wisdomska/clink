import Link from "@/components/ui/link";
import { CaretRight } from "@phosphor-icons/react/dist/ssr";
import { SiteHeader } from "@/components/landing/site-header";
import { SiteFooter } from "@/components/landing/final-cta";
import { CtaLink } from "@/components/landing/cta-link";
import { siteUrl } from "@/lib/site";
import { JsonLd } from "./json-ld";

export type Crumb = { name: string; path: string };

/** "Home / Games / Oware": visible trail plus BreadcrumbList for search results. */
export function Breadcrumbs({ trail }: { trail: Crumb[] }) {
  const all = [{ name: "Home", path: "/" }, ...trail];
  return (
    <>
      <nav aria-label="Breadcrumb" className="text-faint text-sm">
        <ol className="m-0 flex list-none flex-wrap items-center gap-1 p-0">
          {all.map((c, i) => (
            <li key={c.path} className="flex items-center gap-1">
              {i > 0 && <CaretRight size={12} aria-hidden />}
              {i === all.length - 1 ? (
                <span aria-current="page" className="text-muted">
                  {c.name}
                </span>
              ) : (
                <Link href={c.path} className="text-faint hover:text-text">
                  {c.name}
                </Link>
              )}
            </li>
          ))}
        </ol>
      </nav>
      <JsonLd
        data={{
          "@type": "BreadcrumbList",
          itemListElement: all.map((c, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: c.name,
            item: `${siteUrl()}${c.path === "/" ? "" : c.path}`,
          })),
        }}
      />
    </>
  );
}

/** The frame for public content pages: landing header and footer, a readable column. */
export function PublicPage({
  trail,
  eyebrow,
  title,
  lede,
  children,
  wide = false,
}: {
  trail: Crumb[];
  eyebrow?: string;
  title: React.ReactNode;
  lede?: React.ReactNode;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <>
      <SiteHeader />
      <main
        className={`an-screen mx-auto w-full px-4 pt-6 pb-16 md:px-8 md:pt-10 ${wide ? "max-w-[1100px]" : "max-w-[760px]"}`}
      >
        <Breadcrumbs trail={trail} />
        {eyebrow && (
          <p className="text-accent mt-8 mb-0 text-sm font-bold tracking-wide uppercase">
            {eyebrow}
          </p>
        )}
        <h1
          className={`display mb-0 text-[36px] leading-[1.05] md:text-[52px] ${eyebrow ? "mt-2" : "mt-8"}`}
        >
          {title}
        </h1>
        {lede && <p className="text-muted mt-4 mb-0 max-w-[62ch] text-lg leading-[1.55]">{lede}</p>}
        <div className="prose-public mt-10 flex flex-col gap-10">{children}</div>
      </main>
      <SiteFooter />
    </>
  );
}

/** A section with an h2, for long reads. */
export function Section({
  id,
  title,
  children,
}: {
  id?: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={id ? `${id}-h` : undefined} className="flex flex-col gap-4">
      <h2
        id={id ? `${id}-h` : undefined}
        className="display m-0 text-2xl leading-tight md:text-3xl"
      >
        {title}
      </h2>
      <div className="text-muted flex flex-col gap-4 text-base leading-[1.65]">{children}</div>
    </section>
  );
}

/** Questions and answers, shown openly (no accordions) so every answer is readable and quotable. */
export function QA({ items }: { items: { q: string; a: string }[] }) {
  return (
    <dl className="m-0 flex flex-col gap-5">
      {items.map((f) => (
        <div key={f.q} className="flex flex-col gap-1.5">
          <dt className="text-text text-base font-bold">{f.q}</dt>
          <dd className="text-muted m-0 text-base leading-[1.6]">{f.a}</dd>
        </div>
      ))}
    </dl>
  );
}

/** The sign-up nudge at the end of a page. */
export function JoinCta({ line }: { line: string }) {
  return (
    <aside className="border-line bg-s1 rounded-card flex flex-col items-start gap-4 border p-6 md:flex-row md:items-center md:justify-between">
      <p className="text-text m-0 text-lg font-medium">{line}</p>
      <CtaLink href="/signup">Get started free</CtaLink>
    </aside>
  );
}
