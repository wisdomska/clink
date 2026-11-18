import Link from "@/components/ui/link";
import { LogoMark, Logo } from "@/components/brand/logo";
import { CtaLink } from "./cta-link";

/** Closing poster: one line, one action, the mark large enough to tap. */
export function FinalCta() {
  return (
    <section
      aria-labelledby="cta-title"
      className="border-line mx-auto max-w-[1440px] border-t px-4 py-24 md:px-8 md:py-36 xl:px-12"
    >
      <div className="grid items-end gap-12 lg:grid-cols-[minmax(0,1fr)_auto]">
        <div data-reveal>
          <h2
            id="cta-title"
            className="display m-0 text-[clamp(2.75rem,8.6vw,8.5rem)] leading-[0.92] tracking-[-0.035em]"
          >
            <span className="block sm:whitespace-nowrap">Someone&apos;s waiting</span>{" "}
            <span className="text-accent block sm:whitespace-nowrap">for your clink.</span>
          </h2>
          <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-4">
            <CtaLink href="/signup">Get started</CtaLink>
            <Link
              href="/signup?code=1"
              className="text-muted hover:text-text flex h-11 items-center text-base font-medium underline decoration-[var(--line-strong)] underline-offset-4 transition-colors hover:decoration-[var(--accent)]"
            >
              Got an invite code?
            </Link>
          </div>
        </div>
        <div data-reveal style={{ ["--d" as string]: 1 }} className="hidden justify-end lg:flex">
          <LogoMark size={240} />
        </div>
      </div>
    </section>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-line border-t">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-8 px-4 pt-10 pb-[max(2.5rem,env(safe-area-inset-bottom))] md:flex-row md:items-end md:justify-between md:px-8 xl:px-12">
        <div>
          <Logo size={22} />
          <p className="text-faint mt-3 mb-0 text-sm">Made for two. Adults only.</p>
        </div>
        <nav aria-label="Legal">
          <ul className="m-0 flex list-none flex-wrap gap-x-6 gap-y-1 p-0 text-sm font-medium">
            <li>
              <Link href="/privacy" className="text-muted hover:text-text flex h-11 items-center">
                Privacy
              </Link>
            </li>
            <li>
              <Link href="/terms" className="text-muted hover:text-text flex h-11 items-center">
                Terms
              </Link>
            </li>
            <li>
              <Link href="/safety" className="text-muted hover:text-text flex h-11 items-center">
                Help and safety
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}
