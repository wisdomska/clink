/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist, NetworkOnly, NetworkFirst } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}
declare const self: ServiceWorkerGlobalScope;

// Sensitive and private routes are never cached (spec 14.1 Client).
const NEVER_CACHE = [
  /^\/api\/media\//,
  /^\/api\/dark\//,
  /^\/dark(\/|$)/,
  /^\/admin(\/|$)/,
  /^\/api\/admin\//,
  /^\/auth\//,
];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  // New versions take over straight away: a refresh always gets the latest.
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      matcher: ({ url, sameOrigin }) => sameOrigin && NEVER_CACHE.some((r) => r.test(url.pathname)),
      handler: new NetworkOnly(),
    },
    {
      // Storage URLs (signed) are never cached either.
      matcher: ({ url }) =>
        /supabase\.co|r2\.cloudflarestorage\.com|127\.0\.0\.1:54321/.test(url.host),
      handler: new NetworkOnly(),
    },
    {
      // Pages and their data always come from the network when it's there, so a
      // new version shows straight away; the cache is only for going offline.
      matcher: ({ request, sameOrigin }) =>
        sameOrigin && (request.mode === "navigate" || request.headers.get("RSC") === "1"),
      handler: new NetworkFirst({ cacheName: "pages-v2", networkTimeoutSeconds: 4 }),
    },
    ...defaultCache,
  ],
  fallbacks: {
    entries: [{ url: "/offline", matcher: ({ request }) => request.destination === "document" }],
  },
});

serwist.addEventListeners();

// A new version starts clean: drop every runtime cache from the old one (the
// precache manages itself), so no stale page or script survives an update.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => !k.startsWith("serwist-precache")).map((k) => caches.delete(k)),
        ),
      ),
  );
});

// The update-available banner asks the waiting worker to take over.
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") void self.skipWaiting();
});

self.addEventListener("push", (event) => {
  let data: {
    title?: string;
    body?: string;
    url?: string;
    tag?: string;
    silent?: boolean;
    icon?: string;
  } = {};
  try {
    data = event.data?.json() ?? {};
  } catch {
    data = { body: "New moment in Clink" };
  }
  event.waitUntil(
    self.registration.showNotification(data.title ?? "Clink", {
      body: data.body ?? "New moment in Clink",
      tag: data.tag,
      silent: data.silent ?? false,
      icon: data.icon ?? "/icons/clink-192.png",
      badge: "/icons/badge-96.png",
      data: { url: data.url ?? "/us" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data?.url as string) ?? "/us";
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const existing = all.find((c) => new URL(c.url).origin === self.location.origin);
      if (existing) {
        await existing.focus();
        existing.navigate(url).catch(() => undefined);
        return;
      }
      await self.clients.openWindow(url);
    })(),
  );
});
