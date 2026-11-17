/**
 * Call quality on real-world networks (weak mobile data, busy Wi-Fi):
 * Opus with in-band FEC (lost packets are rebuilt) and DTX (silence costs
 * almost nothing), audio sent ahead of video, and video that steps down, or
 * pauses, as the connection weakens and comes back when it recovers.
 */

/** Turn on Opus in-band FEC and DTX in an SDP (offer or answer). */
export function tuneSdp(sdp: string | undefined): string | undefined {
  if (!sdp) return sdp;
  const pt = /a=rtpmap:(\d+) opus\/48000/i.exec(sdp)?.[1];
  if (!pt) return sdp;
  const fmtp = new RegExp(`a=fmtp:${pt} ([^\\r\\n]*)`);
  const want = { useinbandfec: "1", usedtx: "1" };
  if (fmtp.test(sdp)) {
    return sdp.replace(fmtp, (_m, params: string) => {
      const map = new Map(
        params
          .split(";")
          .filter(Boolean)
          .map((kv) => kv.trim().split("=") as [string, string]),
      );
      for (const [k, v] of Object.entries(want)) map.set(k, v);
      return `a=fmtp:${pt} ${[...map].map(([k, v]) => `${k}=${v}`).join(";")}`;
    });
  }
  return sdp.replace(
    new RegExp(`(a=rtpmap:${pt} opus\\/48000[^\\r\\n]*)`, "i"),
    `$1\r\na=fmtp:${pt} useinbandfec=1;usedtx=1`,
  );
}

/** Audio first: voice keeps flowing when bandwidth runs short; video gives way. */
export async function prioritise(pc: RTCPeerConnection) {
  for (const s of pc.getSenders()) {
    if (!s.track) continue;
    try {
      const p = s.getParameters();
      if (!p.encodings?.length) p.encodings = [{}];
      const e = p.encodings[0] as RTCRtpEncodingParameters & {
        priority?: string;
        networkPriority?: string;
      };
      if (s.track.kind === "audio") {
        e.priority = "high";
        e.networkPriority = "high";
        e.maxBitrate = 40_000;
      } else {
        e.priority = "low";
        e.networkPriority = "low";
        (p as RTCRtpSendParameters & { degradationPreference?: string }).degradationPreference =
          "balanced";
      }
      await s.setParameters(p);
    } catch {
      /* not supported here: defaults still work */
    }
  }
}

export type Quality = "good" | "weak" | "poor";

export interface Sample {
  quality: Quality;
  rttMs: number | null;
  loss: number; // 0..1, worst of what we send and receive
  outKbps: number | null; // estimated bandwidth we can send
}

/**
 * One reading of the connection. Call every couple of seconds; keeps the last
 * counters between calls to work out recent packet loss.
 */
export function makeSampler(pc: RTCPeerConnection) {
  let last = new Map<string, { lost: number; recv: number }>();
  return async (): Promise<Sample | null> => {
    let stats: RTCStatsReport;
    try {
      stats = await pc.getStats();
    } catch {
      return null;
    }
    let rtt: number | null = null;
    let outKbps: number | null = null;
    let loss = 0;
    const next = new Map<string, { lost: number; recv: number }>();
    stats.forEach((r) => {
      const s = r as Record<string, unknown> & { type: string; id: string };
      if (s.type === "candidate-pair" && (s.nominated || s.selected) && s.state === "succeeded") {
        if (typeof s.currentRoundTripTime === "number") rtt = s.currentRoundTripTime * 1000;
        if (typeof s.availableOutgoingBitrate === "number")
          outKbps = s.availableOutgoingBitrate / 1000;
      }
      if (s.type === "remote-inbound-rtp" && typeof s.fractionLost === "number")
        loss = Math.max(loss, s.fractionLost);
      if (s.type === "inbound-rtp") {
        const lost = Number(s.packetsLost ?? 0);
        const recv = Number(s.packetsReceived ?? 0);
        next.set(s.id, { lost, recv });
        const prev = last.get(s.id);
        if (prev) {
          const dl = lost - prev.lost;
          const dr = recv - prev.recv;
          if (dl + dr > 20) loss = Math.max(loss, dl / (dl + dr));
        }
      }
    });
    last = next;
    const r = rtt ?? 0;
    const quality: Quality =
      loss > 0.1 || r > 600 || (outKbps !== null && outKbps < 80)
        ? "poor"
        : loss > 0.03 || r > 300 || (outKbps !== null && outKbps < 250)
          ? "weak"
          : "good";
    return { quality, rttMs: rtt, loss, outKbps };
  };
}

/** Cap our outgoing video for the current quality (and pause it on "off"). */
export async function shapeVideo(pc: RTCPeerConnection, level: Quality | "off") {
  const s = pc.getSenders().find((x) => x.track?.kind === "video");
  if (!s) return;
  try {
    const p = s.getParameters();
    if (!p.encodings?.length) p.encodings = [{}];
    const e = p.encodings[0]!;
    e.active = level !== "off";
    e.maxBitrate = level === "good" ? 1_200_000 : level === "weak" ? 450_000 : 160_000;
    e.scaleResolutionDownBy = level === "good" ? 1 : level === "weak" ? 2 : 4;
    e.maxFramerate = level === "poor" ? 15 : 30;
    await s.setParameters(p);
  } catch {
    /* best effort */
  }
}
