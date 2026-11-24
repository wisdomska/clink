import type { Metadata } from "next";
import { InstalledRedirect } from "./installed-redirect";
import { SiteHeader } from "@/components/landing/site-header";
import { Hero } from "@/components/landing/hero";
import { MomentsMarquee } from "@/components/landing/moments-marquee";
import { Statement } from "@/components/landing/statement";
import { ProductTour, type TourStep } from "@/components/landing/product-tour";
import { ChatScreen, GameScreen, LetterScreen, PlansScreen } from "@/components/landing/screens";
import { ClinkDemo } from "@/components/landing/clink-demo";
import { FeatureBento } from "@/components/landing/feature-bento";
import { Trust } from "@/components/landing/trust";
import { Faq } from "@/components/landing/faq";
import { StructuredData } from "@/components/landing/structured-data";
import { FinalCta, SiteFooter } from "@/components/landing/final-cta";
import { RevealController } from "@/components/landing/reveal-controller";
import "@/components/landing/landing.css";

export const metadata: Metadata = {
  title: { absolute: "Clink: Made for two" },
  description:
    "Calls, chat, games, letters and date nights for two people, together or apart. One account links to exactly one person. 18+.",
  robots: { index: true, follow: true },
  alternates: { canonical: "/" },
  openGraph: {
    title: "Clink: two people, one clink",
    description: "Calls, chat, games, letters and date nights for two people, together or apart.",
    url: "/",
    type: "website",
    siteName: "Clink",
    locale: "en_GB",
  },
  twitter: {
    card: "summary_large_image",
    title: "Clink: two people, one clink",
    description: "Calls, chat, games, letters and date nights for two people, together or apart.",
  },
};

const TOUR: TourStep[] = [
  {
    id: "chat",
    title: "Talk like you share a sofa.",
    body: "Messages, voice notes, photos and stickers that sound like them. When typing isn't enough, call from the same screen.",
    screen: <ChatScreen />,
  },
  {
    id: "play",
    title: "Your move.",
    body: "Thirteen games made for two, from Trivia duel to Oware. Play live, or take turns whenever you're free.",
    screen: <GameScreen />,
  },
  {
    id: "letters",
    title: "Letters for later.",
    body: "Write one for the night they can't sleep, or seal a time capsule until a date you choose. It won't open a minute early.",
    screen: <LetterScreen />,
  },
  {
    id: "plans",
    title: "Date night, decided.",
    body: "Can't choose? Spin the date roulette, book it, and count down to the night together.",
    screen: <PlansScreen />,
  },
];

export default function Landing() {
  return (
    <div className="bg-app text-text min-h-dvh overflow-x-clip">
      <InstalledRedirect />
      <RevealController />
      <SiteHeader />
      <main>
        <Hero />
        <MomentsMarquee />
        <Statement />

        <section
          aria-labelledby="tour-title"
          className="mx-auto max-w-[1440px] px-4 pb-24 md:px-8 md:pb-36 xl:px-12"
        >
          <h2
            id="tour-title"
            data-reveal
            className="display m-0 mb-12 max-w-[16ch] text-[clamp(2.5rem,5.5vw,4.75rem)] leading-[0.98] tracking-[-0.03em] lg:mb-4"
          >
            Built for the hours between visits.
          </h2>
          <ProductTour steps={TOUR} />
        </section>

        <section aria-labelledby="try-title" className="border-line bg-s1/40 border-y">
          <div className="mx-auto max-w-[1440px] px-4 py-24 md:px-8 md:py-32 xl:px-12">
            <ClinkDemo />
          </div>
        </section>

        <section
          aria-labelledby="more-title"
          className="mx-auto max-w-[1440px] px-4 pt-24 md:px-8 md:pt-36 xl:px-12"
        >
          <h2
            id="more-title"
            data-reveal
            className="display m-0 mb-10 max-w-[18ch] text-[clamp(2.5rem,5.5vw,4.75rem)] leading-[0.98] tracking-[-0.03em] md:mb-14"
          >
            And the small things that add up.
          </h2>
          <FeatureBento />
        </section>

        <Trust />
        <Faq />
        <StructuredData />
        <FinalCta />
      </main>
      <SiteFooter />
    </div>
  );
}
