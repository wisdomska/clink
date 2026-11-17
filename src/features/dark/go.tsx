"use client";
import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

/**
 * Sends you on from the After Dark gate. A server redirect thrown from the
 * layout renders an empty page when you arrive by in-app navigation (which
 * keeps a call going), so the gate hands off to the client router instead.
 *
 * The After Dark layout is shared by every After Dark page, so it isn't
 * re-run when the URL changes underneath it. Once we've moved, refresh so the
 * gate checks the new page and renders it.
 */
export function DarkGo({ href }: { href: string }) {
  const router = useRouter();
  const path = usePathname();
  const from = useRef(path);
  useEffect(() => router.replace(href), [router, href]);
  useEffect(() => {
    if (path !== from.current) router.refresh();
  }, [path, router]);
  return null;
}
