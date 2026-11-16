import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { CtaLink } from "./cta-link";

/** Sticky landing bar: logo home, sign in, get started. One line at every width. */
export function SiteHeader() {
  return (
    <header className="bg-app/90 border-line/70 sticky top-0 z-40 border-b pt-[env(safe-area-inset-top)] backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-3 px-4 md:h-[72px] md:px-8 xl:px-12">
        <Link href="/" className="text-text hover:text-text -ml-1 flex h-11 items-center px-1">
          <Logo size={24} />
        </Link>
        <nav aria-label="Account" className="flex items-center gap-2">
          <CtaLink href="/login" variant="secondary" size="sm">
            Sign in
          </CtaLink>
          <CtaLink href="/signup" size="sm" className="max-sm:hidden">
            Get started
          </CtaLink>
        </nav>
      </div>
    </header>
  );
}
