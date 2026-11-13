/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist, NetworkOnly } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}
declare const self: ServiceWorkerGlobalScope;

// Sensitive and private routes are never cached (spec 14.1 Client).
const NEVER_CACHE = [/^\/api\/media\//, /^\/api\/dark\//, /^\/dark(\/|$)/, /^\/admin(\/|$)/, /^\/api\/admin\//, /^\/auth\//];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: false,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      matcher: ({ url, sameOrigin }) => sameOrigin && NEVER_CACHE.some((r) => r.test(url.pathname)),
      handler: new NetworkOnly(),
    },
    {
      // Storage URLs (signed) are never cached either.
      matcher: ({ url }) => /supabase\.co|r2\.cloudflarestorage\.com|127\.0\.0\.1:54321/.test(url.host),
      handler: new NetworkOnly(),
    },
    ...defaultCache,
  ],
  fallbacks: {
    entries: [{ url: "/offline", matcher: ({ request }) => request.destination === "document" }],
  },
});

serwist.addEventListeners();

// The update-available banner asks the waiting worker to take over.
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") void self.skipWaiting();
});

self.addEventListener("push", (event) => {
  let data: { title?: string; body?: string; url?: string; tag?: string; silent?: boolean; icon?: string } = {};
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
