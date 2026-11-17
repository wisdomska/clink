import type { Metadata } from "next";
import Link from "next/link";
import { LogoMark } from "@/components/brand/logo";
import { Display } from "@/components/ui/heading";

export const metadata: Metadata = { title: "Not found", robots: { index: false } };

export default function NotFound() {
  return (
    <main className="an-screen mx-auto flex min-h-dvh max-w-[480px] flex-col justify-center gap-4 px-5">
      <LogoMark size={56} title="Clink" />
      <Display>Nothing to clink here.</Display>
      <p className="text-muted m-0 text-base leading-normal">
        That page has moved, or it never existed. Your partner is still where you left them.
      </p>
      <div className="flex flex-wrap gap-2">
        <Link
          href="/us"
          className="press bg-accent text-on-accent hover:text-on-accent flex h-12 items-center rounded-full px-6 text-base font-bold"
        >
          Go to Us
        </Link>
        <Link
          href="/"
          className="press border-line bg-s2 text-text hover:text-text flex h-12 items-center rounded-full border px-6 text-base font-medium"
        >
          Home
        </Link>
      </div>
    </main>
  );
}
