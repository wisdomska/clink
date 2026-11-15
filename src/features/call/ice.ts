/**
 * ICE servers for calls. Public STUN finds a direct path for most home and
 * mobile networks. Strict networks (some offices, some carriers) also need a
 * TURN relay: set NEXT_PUBLIC_TURN_URLS (comma separated), and
 * NEXT_PUBLIC_TURN_USERNAME / NEXT_PUBLIC_TURN_CREDENTIAL, e.g. from a free
 * Metered or Cloudflare TURN account.
 */
export function iceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [
    { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
    { urls: "stun:stun.cloudflare.com:3478" },
  ];
  const turn = process.env.NEXT_PUBLIC_TURN_URLS;
  if (turn)
    servers.push({
      urls: turn.split(",").map((u) => u.trim()),
      username: process.env.NEXT_PUBLIC_TURN_USERNAME,
      credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL,
    });
  return servers;
}
