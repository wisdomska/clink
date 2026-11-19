"use client";
/**
 * True while an After Dark screen is open. When After Dark is opened in-app
 * (so a call keeps going), the page keeps the security policy it loaded
 * with, which is looser than After Dark's own. This flag lets the app hold
 * After Dark to the same rule anyway: nothing leaves for an outside site.
 */
let on = false;
export const setPrivateMode = (v: boolean) => {
  on = v;
};
export const inPrivateMode = () => on;

/** The only places After Dark may talk to: Clink, its database, its storage. */
export function allowedInPrivate(url: URL): boolean {
  if (url.origin === window.location.origin) return true;
  if (url.protocol === "blob:" || url.protocol === "data:") return true;
  try {
    const sb = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "");
    if (url.host === sb.host) return true;
  } catch {
    /* not configured */
  }
  return url.hostname.endsWith(".r2.cloudflarestorage.com");
}
