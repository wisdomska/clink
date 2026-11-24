"use client";
import { usePathname } from "next/navigation";
import { Analytics, type BeforeSendEvent } from "@vercel/analytics/next";

/** After Dark and admin are never counted, even after a soft navigation into them. */
export const isPrivatePath = (path: string) => /^\/(dark|admin)(\/|$)/.test(path);

/**
 * Page views only, cookie-free. The query string and hash are stripped so
 * invite codes, tokens and search terms never leave the device.
 */
export function scrub(event: BeforeSendEvent): BeforeSendEvent | null {
  const url = new URL(event.url);
  if (isPrivatePath(url.pathname)) return null;
  return { ...event, url: url.origin + url.pathname };
}

/** Vercel Web Analytics, served from our own origin (/_vercel/insights). */
export function VercelAnalytics() {
  const path = usePathname() ?? "/";
  if (isPrivatePath(path)) return null;
  return <Analytics beforeSend={scrub} />;
}
