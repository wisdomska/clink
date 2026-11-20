/// <reference lib="webworker" />
import { groupMessage } from "@/lib/push-group";
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
// Every API response is someone's data: never cached, so with several
// accounts on one device nothing from one can be served to another.
const NEVER_CACHE = [
  /^\/api\//,
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
      // Tab prefetches go straight to the network: nothing to cache for offline,
      // and no cache writes competing with the navigation the person is making.
      matcher: ({ request, sameOrigin }) =>
        sameOrigin &&
        request.headers.get("RSC") === "1" &&
        request.headers.get("Next-Router-Prefetch") === "1",
      handler: new NetworkOnly(),
    },
    {
      // Pages and their data always come from the network when it's there, so a
      // new version shows straight away; the cache is only for going offline.
      // Navigation preload starts the request in parallel with worker boot, and
      // a stalled network falls back to the cached copy after 3 s (not 4).
      matcher: ({ request, sameOrigin }) =>
        sameOrigin && (request.mode === "navigate" || request.headers.get("RSC") === "1"),
      // No network timeout: a slow network waits for this account's page rather
      // than showing a cached one (which could be another account's). The cache
      // is only used when truly offline, and is wiped on any account change.
      handler: new NetworkFirst({ cacheName: "pages-v3" }),
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
    type?: string;
    id?: string;
    video?: boolean;
    title?: string;
    body?: string;
    url?: string;
    tag?: string;
    silent?: boolean;
    icon?: string;
    badge?: number;
    from?: string;
  } = {};
  try {
    data = event.data?.json() ?? {};
  } catch {
    data = { body: "New moment in Clink" };
  }
  const icon = data.icon ?? "/icons/clink-192.png";
  // The count on the installed app's icon, sent with the push (never After Dark).
  const nav = self.navigator as Navigator & { setAppBadge?: (n?: number) => Promise<void> };
  if (typeof data.badge === "number" && nav.setAppBadge)
    event.waitUntil(nav.setAppBadge(data.badge).catch(() => undefined));
  if (data.type === "call") {
    // Ring like a phone call, as far as the web allows: stays up until handled,
    // re-alerts, vibrates in a ring pattern, and offers Answer / Decline.
    event.waitUntil(
      self.registration.showNotification(data.title ?? "Clink", {
        body: data.body ?? "Incoming call",
        tag: data.tag,
        icon,
        badge: "/icons/badge-96.png",
        requireInteraction: true,
        renotify: true,
        vibrate: [600, 300, 600, 300, 600, 300, 600],
        actions: [
          { action: "answer", title: data.video ? "Answer with video" : "Answer" },
          { action: "decline", title: "Decline" },
        ],
        data: { url: data.url ?? "/us", type: "call", id: data.id },
      } as NotificationOptions),
    );
    return;
  }
  if (data.type === "call-cancel") {
    // The caller gave up: the ringing notification becomes a quiet missed call.
    event.waitUntil(
      (async () => {
        const open = await self.registration.getNotifications({ tag: data.tag });
        open.forEach((n) => n.close());
        await self.registration.showNotification(data.title ?? "Clink", {
          body: data.body ?? "Missed call",
          tag: data.tag,
          icon,
          badge: "/icons/badge-96.png",
          silent: true,
          data: { url: data.url ?? "/chat" },
        });
      })(),
    );
    return;
  }
  event.waitUntil(
    (async () => {
      // Chat messages stack: one notification that counts up, newest line last.
      let body = data.body ?? "New moment in Clink";
      let count: number | undefined;
      if (data.type === "message" && data.tag) {
        const [prev] = await self.registration.getNotifications({ tag: data.tag });
        const g = groupMessage((prev?.data as { count?: number } | undefined)?.count, {
          body,
          from: data.from,
        });
        body = g.body;
        count = g.count;
      }
      await self.registration.showNotification(data.title ?? "Clink", {
        body,
        tag: data.tag,
        // A grouped update still buzzes (the same tag alone would replace it silently).
        renotify: Boolean(count && count > 1 && !data.silent),
        silent: data.silent ?? false,
        icon,
        badge: "/icons/badge-96.png",
        data: { url: data.url ?? "/us", type: data.type, count },
        // Answer a message right from the notification (Android, desktop Chrome).
        ...(data.type === "message"
          ? { actions: [{ action: "reply", type: "text", title: "Reply", placeholder: "Message" }] }
          : {}),
      } as NotificationOptions);
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const d = (event.notification.data ?? {}) as { url?: string; type?: string; id?: string };
  if (d.type === "call" && event.action === "decline") {
    // Tell the caller without opening the app.
    event.waitUntil(
      fetch("/api/calls/decline", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: d.id }),
      }).catch(() => undefined),
    );
    return;
  }
  // Typed a reply in the notification: send it without opening Clink.
  const reply = (event as NotificationEvent & { reply?: string | null }).reply?.trim();
  if (d.type === "message" && event.action === "reply") {
    if (reply) {
      event.waitUntil(
        fetch("/api/messages", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clientId: `notif-${crypto.randomUUID()}`,
            type: "text",
            body: reply.slice(0, 4000),
          }),
        })
          .then((r) => {
            // Couldn't send (signed out, offline): open the chat so nothing is lost.
            if (!r.ok) return self.clients.openWindow("/chat").then(() => undefined);
          })
          .catch(() => self.clients.openWindow("/chat").then(() => undefined)),
      );
      return;
    }
    // Reply tapped with nothing typed: just open the chat.
  }
  // Answer (or a tap on the call) opens the app straight into the call.
  const url = d.url ?? "/us";
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
