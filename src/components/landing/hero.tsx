import { CtaLink } from "./cta-link";
import { HeroScene } from "./hero-scene";

/** Left-aligned headline and calls to action, the two-cities scene beside it. */
export function Hero() {
  return (
    <section
      aria-labelledby="hero-title"
      className="mx-auto grid max-w-[1440px] gap-10 px-4 pt-8 pb-14 md:px-8 md:pt-12 lg:min-h-[calc(100dvh-72px)] lg:grid-cols-[1.08fr_1fr] lg:items-center lg:gap-12 lg:pt-6 lg:pb-16 xl:gap-20 xl:px-12"
    >
      <div className="max-w-[640px]">
        <h1
          id="hero-title"
          className="display m-0 text-[clamp(3.25rem,17vw,6rem)] leading-[0.92] tracking-[-0.035em] lg:text-[clamp(5rem,8.5vw,8.5rem)]"
        >
          <span className="block whitespace-nowrap">Two cities.</span>{" "}
          <span className="text-accent block whitespace-nowrap">One clink.</span>
        </h1>
        <p className="text-muted mt-6 mb-0 max-w-[40ch] text-lg leading-relaxed text-pretty md:text-xl">
          Calls, chat, games, letters and late-night plans for couples who live apart. Tap once and
          they feel it.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <CtaLink href="/signup">Get started</CtaLink>
          <CtaLink href="/login" variant="secondary">
            Sign in
          </CtaLink>
        </div>
      </div>
      <HeroScene />
    </section>
  );
}
