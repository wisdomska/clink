/**
 * ICE servers for calls, from /api/calls/ice: STUN plus, when configured, a
 * TURN relay with short-lived credentials. Fetched ahead of time and cached
 * so starting or answering a call never waits on it.
 */
let cached: { at: number; servers: RTCIceServer[] } | null = null;
let inflight: Promise<RTCIceServer[]> | null = null;
const FALLBACK: RTCIceServer[] = [
  { urls: ["stun:stun.cloudflare.com:3478", "stun:stun.l.google.com:19302"] },
];

export function iceServers(): Promise<RTCIceServer[]> {
  if (cached && Date.now() - cached.at < 60 * 60 * 1000) return Promise.resolve(cached.servers);
  inflight ??= fetch("/api/calls/ice")
    .then((r) => (r.ok ? r.json() : null))
    .then((d: { iceServers?: RTCIceServer[] } | null) => {
      const servers = d?.iceServers?.length ? d.iceServers : FALLBACK;
      cached = { at: Date.now(), servers };
      return servers;
    })
    .catch(() => FALLBACK)
    .finally(() => {
      inflight = null;
    });
  return inflight;
}
