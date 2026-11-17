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
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", userId);
  let sent = 0;
  await Promise.all(
    (subs ?? []).map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload,
          {
            TTL: 60 * 60 * 12,
            urgency: category === "clinks" ? "high" : "normal",
          },
        );
        sent++;
        await admin
          .from("push_subscriptions")
          .update({ last_ok_at: new Date().toISOString() })
          .eq("id", s.id);
      } catch (err) {
        const code = (err as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410)
          await admin.from("push_subscriptions").delete().eq("id", s.id);
      }
    }),
  );
  return { sent };
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
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", userId);
  let sent = 0;
  await Promise.all(
    (subs ?? []).map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload,
          {
            TTL: call.cancel ? 3600 : 45,
            urgency: "high",
            topic: `call${call.id.replace(/-/g, "").slice(0, 26)}`,
          },
        );
        sent++;
      } catch (err) {
        const code = (err as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410)
          await admin.from("push_subscriptions").delete().eq("id", s.id);
      }
    }),
  );
  return { sent };
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
