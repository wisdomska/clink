import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { HeroGlasses } from "@/components/clink/hero-glasses";
import { MiniBoard, MiniEnvelope, MiniMatchbook, MiniStub } from "@/components/clink/objects-mini";
import { InstalledRedirect } from "./installed-redirect";

export const metadata: Metadata = {
  title: { absolute: "Clink: do things together, from apart" },
  description:
    "Games, dates, dares and letters for two people in two places. One account links to exactly one person. 18+.",
  robots: { index: true, follow: true },
  alternates: { canonical: "/" },
  openGraph: {
    title: "Clink: do things together, from apart",
    description: "Games, dates, dares and letters for two people in two places.",
    type: "website",
    siteName: "Clink",
  },
  twitter: { card: "summary_large_image" },
};

const cta =
  "press flex h-14 items-center justify-center gap-2 rounded-full bg-accent px-7 text-base font-bold text-on-accent hover:text-on-accent";
const ctaSecondary =
  "press flex h-[52px] items-center justify-center rounded-full border border-line bg-s2 px-7 text-base font-medium text-text hover:text-text";

export default function Landing() {
  return (
    <div className="an-screen min-h-dvh bg-app pt-[max(env(safe-area-inset-top),4px)] pb-8">
      <InstalledRedirect />
      <header className="mx-auto flex h-12 max-w-[1200px] items-center justify-between px-4 md:h-[72px] md:px-8">
        <Link href="/" className="display text-[28px] text-text hover:text-text" aria-label="Clink home">
          clink
        </Link>
        <Link
          href="/login"
          className="press flex h-11 items-center rounded-full border border-line bg-transparent px-[18px] text-sm font-medium text-text hover:text-text"
        >
          Log in
        </Link>
      </header>

      <main className="mx-auto max-w-[1200px]">
        {/* Hero: stacked on phones, split from 1024 px */}
        <section className="grid gap-0 px-4 pt-4 md:px-8 lg:grid-cols-[1fr_1.05fr] lg:items-center lg:gap-16 lg:pt-12">
          <div className="order-2 lg:order-1">
            <h1 className="display mt-7 mb-0 text-[48px] leading-[1.05] md:text-[64px] lg:mt-0">
              Do things <em>together</em>, from apart.
            </h1>
            <p className="mt-3 mb-0 max-w-[46ch] text-base leading-normal text-muted text-pretty md:text-lg">
              Games, dates, dares and letters for two people in two places. One account links to exactly one person.
            </p>
            <div className="mt-6 flex flex-col gap-2 sm:max-w-[420px] lg:flex-row lg:max-w-none">
              <Link href="/signup" className={cta}>
                Start with your person <ArrowRight size={20} aria-hidden />
              </Link>
              <Link href="/signup?code=1" className={ctaSecondary}>
                I have a code
              </Link>
            </div>
          </div>
          <div className="order-1 lg:order-2">
            <HeroGlasses />
          </div>
        </section>

        {/* Four objects. Mobile keeps the prototype's alternating rows; desktop becomes an offset 2x2. */}
        <section aria-labelledby="table" className="mt-14 flex flex-col gap-10 px-4 md:px-8 lg:mt-28">
          <h2 id="table" className="display m-0 text-[28px] leading-[1.1] md:text-[36px]">
            Four things on the table.
          </h2>
          <div className="grid gap-10 lg:grid-cols-2 lg:gap-x-16 lg:gap-y-20">
            <div className="grid grid-cols-[112px_1fr] items-center gap-5 lg:grid-cols-[140px_1fr]">
              <MiniMatchbook />
              <div>
                <h3 className="display m-0 text-[22px] leading-[1.1]">Dares, one match at a time.</h3>
                <p className="mt-1.5 mb-0 text-base leading-normal text-muted">Spin, strike, reveal. Pass is always free.</p>
              </div>
            </div>
            <div className="grid grid-cols-[1fr_156px] items-center gap-4 lg:mt-24">
              <div>
                <h3 className="display m-0 text-[22px] leading-[1.1]">Date nights with a stub.</h3>
                <p className="mt-1.5 mb-0 text-base leading-normal text-muted">
                  Cook together, stargaze, tour a museum. Tear it off when you&apos;re done.
                </p>
              </div>
              <MiniStub />
            </div>
            <div className="grid grid-cols-[156px_1fr] items-center gap-4">
              <MiniEnvelope />
              <div>
                <h3 className="display m-0 text-[22px] leading-[1.1]">Letters for later.</h3>
                <p className="mt-1.5 mb-0 text-base leading-normal text-muted">
                  Open when you can&apos;t sleep. Sealed until they need it.
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-3 lg:mt-24">
              <MiniBoard />
              <div>
                <h3 className="display m-0 text-[22px] leading-[1.1]">The countdown to arrivals.</h3>
                <p className="mt-1.5 mb-0 text-base leading-normal text-muted">
                  Your next visit, flipping down on a departure board.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-4 mt-12 flex items-start gap-3 rounded-card border border-line p-4 md:mx-8 lg:mt-24 lg:max-w-[640px]">
          <div className="display flex h-11 w-11 flex-none items-center justify-center rounded-full border-[1.5px] border-text text-base tracking-normal">
            18+
          </div>
          <p className="m-0 text-base leading-normal text-muted">
            Clink is for adults in a relationship. After Dark, the private space, only opens when you both say yes.
          </p>
        </section>
      </main>

      <footer className="mx-4 mt-10 flex max-w-[1200px] items-end justify-between border-t border-line pt-5 md:mx-8 lg:mx-auto lg:px-8">
        <div>
          <div className="display text-[22px] tracking-normal">clink</div>
          <div className="text-sm text-faint">Made for two.</div>
        </div>
        <nav aria-label="Legal" className="flex flex-col gap-1 text-right text-sm font-medium">
          <Link href="/privacy" className="text-muted">Privacy</Link>
          <Link href="/terms" className="text-muted">Terms</Link>
          <Link href="/safety" className="text-muted">Help and safety</Link>
        </nav>
      </footer>
    </div>
  );
}
