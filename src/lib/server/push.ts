import "server-only";
import { after } from "next/server";
import * as webpush from "web-push";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { serverEnv } from "@/lib/env";
import { isQuietHours } from "@/lib/time";
import { pushText, categoryEnabled, type PushCategory, type PushPrefs } from "@/lib/push-copy";

let configured = false;
function configure(): boolean {
  if (configured) return true;
  const env = serverEnv();
  if (!env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) return false;
  webpush.setVapidDetails(
    env.VAPID_SUBJECT,
    env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    env.VAPID_PRIVATE_KEY,
  );
  configured = true;
  return true;
}

export interface Delivery {
  device: string;
  ok: boolean;
  status?: number;
  reason?: string;
}

/** Where a subscription delivers, in words ("iPhone (Apple)"), for results people read. */
function deviceName(endpoint: string, ua: string | null): string {
  const host = (() => {
    try {
      return new URL(endpoint).host;
    } catch {
      return "";
    }
  })();
  const service = host.includes("apple")
    ? "Apple"
    : host.includes("google")
      ? "Google"
      : host.includes("mozilla")
        ? "Mozilla"
        : host.includes("windows")
          ? "Microsoft"
          : host;
  const kind = /iPhone/.test(ua ?? "")
    ? "iPhone"
    : /iPad/.test(ua ?? "")
      ? "iPad"
      : /Android/.test(ua ?? "")
        ? "Android"
        : /Mac OS X/.test(ua ?? "")
          ? "Mac"
          : /Windows/.test(ua ?? "")
            ? "Windows"
            : "Device";
  return `${kind} (${service})`;
}

/**
 * Send one payload to each subscription and record the outcome on it: when it
 * last worked, or the push service's exact refusal. Gone subscriptions (404,
 * 410) are removed. Nothing is swallowed silently any more.
 */
async function deliver(
  subs: Array<{ id: string; endpoint: string; p256dh: string; auth: string; ua?: string | null }>,
  payload: string,
  options: webpush.RequestOptions,
): Promise<Delivery[]> {
  const admin = supabaseAdmin();
  return Promise.all(
    subs.map(async (s): Promise<Delivery> => {
      const device = deviceName(s.endpoint, s.ua ?? null);
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload,
          options,
        );
        await admin
          .from("push_subscriptions")
          .update({ last_ok_at: new Date().toISOString(), last_error: null })
          .eq("id", s.id);
        return { device, ok: true };
      } catch (err) {
        const e = err as { statusCode?: number; body?: string; message?: string };
        const reason =
          `${e.statusCode ?? "error"} ${(e.body || e.message || "").slice(0, 300)}`.trim();
        console.error("push failed", device, reason);
        if (e.statusCode === 404 || e.statusCode === 410)
          await admin.from("push_subscriptions").delete().eq("id", s.id);
        else
          await admin
            .from("push_subscriptions")
            .update({ last_error: reason, last_error_at: new Date().toISOString() })
            .eq("id", s.id);
        return { device, ok: false, status: e.statusCode, reason };
      }
    }),
  );
}

/** A test notification to every device of this user, ignoring quiet hours and preferences. */
export async function notifyTest(userId: string): Promise<Delivery[] | "no_vapid"> {
  if (!configure()) return "no_vapid";
  const { data: subs } = await supabaseAdmin()
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth, ua")
    .eq("user_id", userId);
  return deliver(
    subs ?? [],
    JSON.stringify({
      title: "Clink",
      body: "Notifications work on this device.",
      url: "/settings",
      tag: "test",
      icon: "/icons/clink-192.png",
    }),
    { TTL: 600, urgency: "high" },
  );
}

const APP_NAMES: Record<string, string> = { clink: "Clink", notes: "Notes", weather: "Weather" };

/**
 * Send a Web Push to every device of a user, respecting category prefs and
 * quiet hours (Clinks during quiet hours are delivered silently, others wait).
 * dedupeKey makes reminders idempotent across cron runs.
 */
export async function notify(
  userId: string,
  category: PushCategory,
  msg: { title?: string; body: string; url?: string; tag?: string },
  dedupeKey?: string,
): Promise<{ sent: number; skipped?: string }> {
  if (!configure()) return { sent: 0, skipped: "no_vapid" };
  const admin = supabaseAdmin();
  const { data: profile } = await admin
    .from("profiles")
    .select("notify, quiet_start, quiet_end, timezone, app_icon, suspended_at, deleted_at")
    .eq("id", userId)
    .single();
  if (!profile || profile.suspended_at || profile.deleted_at)
    return { sent: 0, skipped: "inactive" };
  const prefs = (profile.notify ?? {}) as PushPrefs;
  if (!categoryEnabled(category, prefs)) return { sent: 0, skipped: "pref_off" };
  const quiet = isQuietHours(new Date(), profile.timezone, profile.quiet_start, profile.quiet_end);
  if (quiet && category !== "clinks") return { sent: 0, skipped: "quiet_hours" };

  if (dedupeKey) {
    const { error } = await admin
      .from("notification_log")
      .insert({ user_id: userId, category, dedupe_key: dedupeKey });
    if (error) return { sent: 0, skipped: "duplicate" };
  }

  const { title, body } = pushText(
    category,
    msg.body,
    prefs,
    APP_NAMES[profile.app_icon] ?? "Clink",
  );
  const payload = JSON.stringify({
    title,
    body,
    url: category === "dark" ? "/dark" : (msg.url ?? "/us"),
    tag: msg.tag ?? category,
    silent: quiet,
    icon: `/icons/${profile.app_icon}-192.png`,
  });
  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth, ua")
    .eq("user_id", userId);
  const results = await deliver(subs ?? [], payload, {
    TTL: 60 * 60 * 12,
    urgency: category === "clinks" ? "high" : "normal",
  });
  return { sent: results.filter((r) => r.ok).length };
}

/**
 * An incoming call, as close to a phone ring as Web Push allows: high
 * urgency, a short life (a call nobody can answer any more is useless), one
 * tag per call so the follow-up replaces it, and Answer / Decline actions.
 * Calls ring unless the person turned call alerts off; the text stays
 * discreet ("Incoming call") unless they chose detailed notifications.
 * `cancel` swaps a ringing notification for a quiet "missed call".
 */
export async function notifyCall(
  userId: string,
  call: { id: string; video: boolean; from: string; cancel?: boolean },
): Promise<{ sent: number; skipped?: string }> {
  if (!configure()) return { sent: 0, skipped: "no_vapid" };
  const admin = supabaseAdmin();
  const { data: profile } = await admin
    .from("profiles")
    .select("notify, app_icon, suspended_at, deleted_at")
    .eq("id", userId)
    .single();
  if (!profile || profile.suspended_at || profile.deleted_at)
    return { sent: 0, skipped: "inactive" };
  const prefs = (profile.notify ?? {}) as PushPrefs & { calls?: boolean };
  if (prefs.calls === false) return { sent: 0, skipped: "pref_off" };
  const app = APP_NAMES[profile.app_icon] ?? "Clink";
  const kind = call.video ? "Video call" : "Voice call";
  const payload = JSON.stringify({
    type: call.cancel ? "call-cancel" : "call",
    id: call.id,
    video: call.video,
    title: app,
    body: call.cancel
      ? prefs.detailed
        ? `Missed ${kind.toLowerCase()} from ${call.from}`
        : "Missed call"
      : prefs.detailed
        ? `${call.from}: incoming ${kind.toLowerCase()}`
        : `Incoming ${kind.toLowerCase()}`,
    url: call.cancel ? "/chat" : `/us?answer=${encodeURIComponent(call.id)}`,
    tag: `call-${call.id}`,
    icon: `/icons/${profile.app_icon}-192.png`,
  });
  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth, ua")
    .eq("user_id", userId);
  const results = await deliver(subs ?? [], payload, {
    TTL: call.cancel ? 3600 : 45,
    urgency: "high",
    topic: `call${call.id.replace(/-/g, "").slice(0, 26)}`,
  });
  return { sent: results.filter((r) => r.ok).length };
}

/**
 * Send a push after the response has gone out, so the person tapping never
 * waits on push services. Failures are logged, never surfaced.
 */
export function notifyLater(...args: Parameters<typeof notify>): void {
  after(() =>
    notify(...args).then(
      () => undefined,
      (e) => console.error("push failed", e),
    ),
  );
}
