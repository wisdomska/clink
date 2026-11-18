"use client";
import { useEffect } from "react";
import { WifiSlash } from "@phosphor-icons/react";
import { toast } from "@/components/ui/toast";
import { useOnline } from "@/lib/hooks";

/** Saves that never wait: chat has its own queue, calls and pings are live-only. */
const SKIP = /^\/api\/(messages|calls|push|dark\/(ping|lock|notice)|health)(\/|$)/;
const MUTATING = new Set(["POST", "PATCH", "PUT", "DELETE"]);
/** Direct database writes (countdowns, moods, lists) go to Supabase's REST API. */
const SUPABASE = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").origin;
  } catch {
    return "";
  }
})();
/** Long enough for a lift or a tunnel; after that the save fails as before. */
const WAIT_MS = 5 * 60_000;

function waitForOnline(): Promise<boolean> {
  if (navigator.onLine) return Promise.resolve(true);
  return new Promise((resolve) => {
    const done = (ok: boolean) => {
      window.removeEventListener("online", on);
      clearTimeout(t);
      resolve(ok);
    };
    const on = () => done(true);
    const t = setTimeout(() => done(false), WAIT_MS);
    window.addEventListener("online", on);
  });
}

let installed = false;
let told = 0;

/**
 * Offline, a save to Clink or its database (a countdown, a game move, a
 * request, a mood)
 * waits for the connection and then goes through, instead of failing. The
 * button keeps its busy state while it waits, and a note says why.
 *
 * Only requests that never left the device are held or retried, so nothing
 * is ever sent twice.
 */
function install() {
  if (installed) return;
  installed = true;
  const original = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const req = input instanceof Request ? input : null;
    const method = (init?.method ?? req?.method ?? "GET").toUpperCase();
    let ours = false;
    try {
      const url = new URL(req ? req.url : String(input), window.location.href);
      if (url.origin === window.location.origin)
        ours = url.pathname.startsWith("/api/") && !SKIP.test(url.pathname);
      // Writes only: reads (including read-only RPCs) fail fast as before.
      else if (SUPABASE && url.origin === SUPABASE)
        ours = url.pathname.startsWith("/rest/v1/") && !url.pathname.startsWith("/rest/v1/rpc/");
    } catch {
      /* not a URL we hold */
    }
    const holdable = MUTATING.has(method) && ours;
    if (!holdable) return original(input, init);
    if (!navigator.onLine) {
      if (Date.now() - told > 4000) {
        told = Date.now();
        toast("You're offline. This will save when you're back.");
      }
      if (!(await waitForOnline())) return original(input, init);
    }
    try {
      return await original(input, init);
    } catch (e) {
      // The connection dropped before it was sent: wait and try once more.
      if (!navigator.onLine && (await waitForOnline())) return original(input, init);
      throw e;
    }
  };
}

export function OfflineSaves() {
  useEffect(install, []);
  return null;
}

/** The offline bar for screens outside the main app shell (After Dark). */
export function OfflineBar() {
  const online = useOnline();
  if (online) return null;
  return (
    <div
      role="status"
      className="an-banner bg-s2 border-accent text-text sticky top-0 z-30 flex items-center gap-2.5 border-b-2 px-4 py-2.5 pt-[calc(env(safe-area-inset-top)+10px)] text-sm font-bold"
    >
      <WifiSlash size={18} weight="bold" className="text-warning" aria-hidden />
      You&apos;re offline. Saves go through when you&apos;re back.
    </div>
  );
}
