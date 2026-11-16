import { handler, ok, requireCouple } from "@/lib/server/api";

const STUN: RTCIceServer[] = [
  { urls: ["stun:stun.cloudflare.com:3478", "stun:stun.l.google.com:19302"] },
];

/**
 * ICE servers for a call. STUN finds a direct path on most home Wi-Fi, but
 * mobile data and strict networks need a TURN relay, or the call never
 * connects. With CF_TURN_KEY_ID and CF_TURN_KEY_API_TOKEN set (Cloudflare
 * Realtime TURN, free up to 1,000 GB a month), this hands out short-lived relay
 * credentials so the secret never reaches the browser.
 */
export const GET = handler(async () => {
  await requireCouple();
  const id = process.env.CF_TURN_KEY_ID;
  const token = process.env.CF_TURN_KEY_API_TOKEN;
  if (id && token) {
    try {
      const r = await fetch(
        `https://rtc.live.cloudflare.com/v1/turn/keys/${id}/credentials/generate-ice-servers`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ ttl: 6 * 3600 }),
          signal: AbortSignal.timeout(4000),
        },
      );
      if (r.ok) {
        const d = (await r.json()) as { iceServers: RTCIceServer | RTCIceServer[] };
        const relay = Array.isArray(d.iceServers) ? d.iceServers : [d.iceServers];
        return ok({ iceServers: [...STUN, ...relay], relay: true });
      }
    } catch {
      /* fall through to STUN only */
    }
  }
  const urls = process.env.NEXT_PUBLIC_TURN_URLS;
  if (urls)
    return ok({
      iceServers: [
        ...STUN,
        {
          urls: urls.split(",").map((u) => u.trim()),
          username: process.env.NEXT_PUBLIC_TURN_USERNAME,
          credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL,
        },
      ],
      relay: true,
    });
  return ok({ iceServers: STUN, relay: false });
});
