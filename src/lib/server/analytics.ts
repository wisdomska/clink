import "server-only";
import { sanitizeEvent } from "@/lib/analytics-events";
import { sha256 } from "@/lib/server/crypto";

/**
 * Cookieless, server-side capture to PostHog (EU). Ids are hashed; properties
 * are whitelisted; After Dark events carry tier/outcome only. No-op without a key.
 */
export async function track(
  name: string,
  userId: string | null,
  props: Record<string, unknown> = {},
  coupleId?: string | null,
) {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return;
  const ev = sanitizeEvent(name, props);
  if (!ev) return;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com";
  try {
    await fetch(`${host}/capture/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: key,
        event: ev.name,
        distinct_id: userId ? sha256(`u:${userId}`).slice(0, 32) : "anon",
        properties: {
          ...ev.props,
          couple: coupleId ? sha256(`c:${coupleId}`).slice(0, 32) : undefined,
          $process_person_profile: false,
        },
      }),
      signal: AbortSignal.timeout(2500),
    });
  } catch {
    /* analytics must never break the app */
  }
}
