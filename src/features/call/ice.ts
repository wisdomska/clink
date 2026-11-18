/**
 * ICE servers for calls, from /api/calls/ice: STUN plus, when configured, a
 * TURN relay with short-lived credentials. Fetched ahead of time and cached
 * so starting or answering a call never waits on it. The cache survives
 * reopening the app for an hour (the credentials last six), so opening Clink
 * doesn't ask the server for new ones every time.
 */
const KEY = "clink.ice";
const FRESH = 60 * 60 * 1000;
let cached: { at: number; servers: RTCIceServer[] } | null = null;

function fromStorage(): typeof cached {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "null") as typeof cached;
    return v && Array.isArray(v.servers) && Date.now() - v.at < FRESH ? v : null;
  } catch {
    return null;
  }
}
let inflight: Promise<RTCIceServer[]> | null = null;
const FALLBACK: RTCIceServer[] = [
  { urls: ["stun:stun.cloudflare.com:3478", "stun:stun.l.google.com:19302"] },
];

export function iceServers(): Promise<RTCIceServer[]> {
  cached ??= fromStorage();
  if (cached && Date.now() - cached.at < FRESH) return Promise.resolve(cached.servers);
  inflight ??= fetch("/api/calls/ice")
    .then((r) => (r.ok ? r.json() : null))
    .then((d: { iceServers?: RTCIceServer[] } | null) => {
      const servers = d?.iceServers?.length ? d.iceServers : FALLBACK;
      cached = { at: Date.now(), servers };
      if (servers !== FALLBACK)
        try {
          localStorage.setItem(KEY, JSON.stringify(cached));
        } catch {
          /* storage blocked: memory cache only */
        }
      return servers;
    })
    .catch(() => FALLBACK)
    .finally(() => {
      inflight = null;
    });
  return inflight;
}
