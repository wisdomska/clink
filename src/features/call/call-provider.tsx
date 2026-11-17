"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useCouple, useCoupleEvent } from "@/features/couple/context";
import { toast } from "@/components/ui/toast";
import { haptic } from "@/lib/feedback";
import { startTone, stopTones, primeTones, playHangupTone } from "@/lib/tones";
import { setCallActive } from "@/lib/call-flag";
import { iceServers } from "./ice";
import { tuneSdp, prioritise, makeSampler, shapeVideo, type Quality } from "./call-net";
import { CallScreen } from "./call-screen";

export type CallPhase = "idle" | "outgoing" | "incoming" | "connecting" | "live" | "ended";

export interface CallState {
  id: string;
  video: boolean;
  phase: CallPhase;
  startedAt: number | null;
  muted: boolean;
  cameraOff: boolean;
  facing: "user" | "environment";
  remoteCameraOff: boolean;
  endReason: string | null;
  /** Their audio on the loudspeaker (vs the earpiece). */
  speaker: boolean;
  /** Live connection quality while the call is up. */
  quality: Quality | null;
  /** The network dropped: trying to get the call back. */
  reconnecting: boolean;
  remoteMuted: boolean;
  /** Our video is paused because the connection is too weak for it. */
  videoPaused: boolean;
  /** Their video is paused for the same reason. */
  remoteVideoPaused: boolean;
}

export interface CallReaction {
  key: string;
  emoji: string;
  mine: boolean;
}

interface CallApi {
  call: CallState | null;
  local: MediaStream | null;
  remote: MediaStream | null;
  start: (video: boolean) => void;
  accept: () => void;
  decline: () => void;
  hangUp: () => void;
  toggleMute: () => void;
  toggleCamera: () => void;
  flipCamera: () => void;
  toggleSpeaker: () => void;
  /** Turn a voice call into a video call (or turn your camera on in one). */
  upgradeToVideo: () => void;
  react: (emoji: string) => void;
  reactions: CallReaction[];
}

const Ctx = createContext<CallApi | null>(null);
export const useCall = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error("useCall outside CallProvider");
  return v;
};

const RING_TIMEOUT = 45_000;
/** Wall-clock time; only ever called from event handlers, never while rendering. */
const nowMs = () => Date.now();
/** How long a dropped call keeps trying to come back before it ends. */
const RECONNECT_FOR = 30_000;
/** A page reloaded mid-call has this long to come back to the same call. */
const RESUME_FOR = 15_000;
const RESUME_KEY = "clink.call.resume";
interface Resume {
  id: string;
  video: boolean;
  startedAt: number | null;
  iCalled: boolean;
  muted: boolean;
  at: number;
}
const baseState = (id: string, video: boolean, phase: CallPhase): CallState => ({
  id,
  video,
  phase,
  startedAt: null,
  muted: false,
  cameraOff: false,
  facing: "user",
  remoteCameraOff: false,
  endReason: null,
  speaker: video,
  quality: null,
  reconnecting: false,
  remoteMuted: false,
  videoPaused: false,
  remoteVideoPaused: false,
});
const forceRelay = () => {
  try {
    return localStorage.getItem("clink_force_relay") === "1";
  } catch {
    return false;
  }
};
const ENDED_MESSAGES: Record<string, string> = {
  declined: "They can't pick up right now.",
  elsewhere: "Answered on another device.",
  missed: "No answer.",
  failed: "Couldn't connect your networks. Try Wi-Fi on both sides, or call again in a moment.",
  media: "Clink needs your microphone (and camera for video) to call.",
  ended: "Call ended.",
};

/**
 * In-app voice and video calls, no phone number needed. Signalling rides the
 * couple's private realtime channel; audio and video go peer to peer (WebRTC,
 * encrypted with DTLS-SRTP). The caller sends the offer once the callee accepts.
 */
export function CallProvider({ children }: { children: React.ReactNode }) {
  const { send, partner, presence, me, connected } = useCouple();
  const [call, setCall] = useState<CallState | null>(null);
  const [local, setLocal] = useState<MediaStream | null>(null);
  const [remote, setRemote] = useState<MediaStream | null>(null);
  const pc = useRef<RTCPeerConnection | null>(null);
  const callRef = useRef<CallState | null>(null);
  const localRef = useRef<MediaStream | null>(null);
  const pendingIce = useRef<RTCIceCandidateInit[]>([]);
  const ringTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ringTone = useRef<ReturnType<typeof setInterval> | null>(null);
  const iCalled = useRef(false);
  const restarted = useRef(false);
  const reannounce = useRef<ReturnType<typeof setInterval> | null>(null);
  // Their call won a same-moment race while our camera was still starting: answer it once it is.
  const pendingMerge = useRef(false);
  const monitor = useRef<ReturnType<typeof setInterval> | null>(null);
  const lostSince = useRef<number | null>(null);
  const pendingAnswer = useRef<string | null>(null);
  const [reactions, setReactions] = useState<CallReaction[]>([]);

  // Warm up: audio unlock on the first tap, and relay credentials ahead of time.
  useEffect(() => {
    primeTones();
    void iceServers();
    // Opened from a call notification's Answer: pick that call up as soon as it
    // arrives (the caller re-announces it every few seconds), and nudge them now.
    const params = new URLSearchParams(window.location.search);
    const answer = params.get("answer");
    if (answer) {
      pendingAnswer.current = answer;
      params.delete("answer");
      const q = params.toString();
      window.history.replaceState(null, "", `${window.location.pathname}${q ? `?${q}` : ""}`);
      setTimeout(() => send("call:wake", { id: answer }), 800);
      setTimeout(() => (pendingAnswer.current = null), RING_TIMEOUT);
    }
  }, [send]);

  /** The caller writes the call into the chat once it's over. */
  const logCall = (c: CallState | null, reason: string | null) => {
    if (!c || !iCalled.current) return;
    iCalled.current = false;
    const seconds = c.startedAt ? Math.round((Date.now() - c.startedAt) / 1000) : 0;
    const outcome =
      seconds > 0
        ? "ended"
        : reason === "declined" || reason === "busy"
          ? "declined"
          : reason === "failed"
            ? "failed"
            : "missed";
    void fetch("/api/calls/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ outcome, video: c.video, seconds }),
    }).catch(() => undefined);
  };

  const update = useCallback((p: Partial<CallState> | null) => {
    setCall((cur) => {
      const next = p === null ? null : cur ? { ...cur, ...p } : null;
      callRef.current = next;
      return next;
    });
  }, []);

  const stopRinging = () => {
    if (ringTimer.current) clearTimeout(ringTimer.current);
    if (ringTone.current) clearInterval(ringTone.current);
    if (reannounce.current) clearInterval(reannounce.current);
    pendingMerge.current = false;
    ringTimer.current = null;
    ringTone.current = null;
    reannounce.current = null;
    stopTones();
  };

  const cleanup = useCallback(
    (reason: string | null) => {
      const was = callRef.current;
      // Nobody picked up (or we gave up): their ringing notification becomes a missed call.
      if (was && iCalled.current && was.phase === "outgoing" && reason !== "declined")
        void fetch("/api/calls/ring", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: was.id, video: was.video, cancel: true }),
        }).catch(() => undefined);
      stopRinging();
      if (monitor.current) clearInterval(monitor.current);
      monitor.current = null;
      lostSince.current = null;
      restarted.current = false;
      setReactions([]);
      pc.current?.close();
      pc.current = null;
      localRef.current?.getTracks().forEach((t) => t.stop());
      localRef.current = null;
      pendingIce.current = [];
      setLocal(null);
      setRemote(null);
      if (!callRef.current) return;
      if (reason !== "media") logCall(callRef.current, reason);
      if (reason && reason !== "local" && reason !== "media") playHangupTone();
      if (reason && reason !== "local") {
        update({ phase: "ended", endReason: reason });
        setTimeout(() => {
          if (callRef.current?.phase === "ended") {
            callRef.current = null;
            setCall(null);
          }
        }, 2600);
      } else {
        callRef.current = null;
        setCall(null);
      }
    },
    [update],
  );

  const getMedia = async (video: boolean, facing: "user" | "environment" = "user") => {
    const s = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      video: video ? { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } } : false,
    });
    localRef.current = s;
    setLocal(s);
    return s;
  };

  const goLive = () => {
    if (callRef.current && callRef.current.phase !== "live" && callRef.current.phase !== "ended") {
      stopRinging();
      update({ phase: "live", startedAt: callRef.current.startedAt ?? nowMs() });
      haptic("success");
      startMonitor();
    } else if (callRef.current?.reconnecting) {
      lostSince.current = null;
      update({ reconnecting: false });
      // After a resume the old connection's monitor is gone; watch the new one.
      startMonitor();
    }
  };

  /** Every 2 s: read the connection, show it, and shape our video to fit. */
  const startMonitor = () => {
    const p = pc.current;
    if (!p || monitor.current) return;
    void prioritise(p);
    const sample = makeSampler(p);
    let low = 0;
    let high = 0;
    let lastLevel: Quality | "off" | null = null;
    monitor.current = setInterval(async () => {
      const c = callRef.current;
      if (!c || pc.current !== p) return;
      const s = await sample();
      if (!s) return;
      if (s.quality !== c.quality) update({ quality: s.quality });
      if (!c.video || c.cameraOff) return;
      // Very little bandwidth for a while: pause our video (voice keeps going),
      // bring it back once the connection has recovered for a few seconds.
      const kbps = s.outKbps ?? 1000;
      low = kbps < 120 ? low + 1 : 0;
      high = kbps > 350 ? high + 1 : 0;
      let level: Quality | "off" = s.quality;
      if (c.videoPaused) level = high >= 3 ? s.quality : "off";
      else if (low >= 3) level = "off";
      if (level !== lastLevel) {
        lastLevel = level;
        void shapeVideo(p, level);
        const paused = level === "off";
        if (paused !== c.videoPaused) {
          update({ videoPaused: paused });
          send("call:videopause", { id: c.id, paused });
        }
      }
    }, 2000);
  };

  /** Ask for a fresh network path (new Wi-Fi, mobile data, a blip). Only the caller offers. */
  const restartIce = async () => {
    const p = pc.current;
    const c = callRef.current;
    if (!p || !c) return;
    if (!iCalled.current) {
      send("call:restart", { id: c.id });
      return;
    }
    try {
      p.restartIce?.();
      const offer = await p.createOffer({ iceRestart: true });
      await p.setLocalDescription({ type: "offer", sdp: tuneSdp(offer.sdp) });
      send("call:sdp", { id: c.id, sdp: p.localDescription?.toJSON() });
    } catch {
      /* next state change tries again */
    }
  };

  const makePeer = async (id: string, stream: MediaStream) => {
    const p = new RTCPeerConnection({
      iceServers: await iceServers(),
      // Support/testing: force every call through the TURN relay to prove it works.
      iceTransportPolicy: forceRelay() ? "relay" : "all",
    });
    stream.getTracks().forEach((t) => p.addTrack(t, stream));
    p.onicecandidate = (e) =>
      e.candidate && send("call:ice", { id, candidate: e.candidate.toJSON() });
    p.ontrack = (e) => {
      const s = e.streams[0] ?? new MediaStream([e.track]);
      // A fresh object each time, so the screen re-attaches when video joins audio.
      setRemote(new MediaStream(s.getTracks()));
      // Media actually flowing is the surest sign the call is up.
      e.track.onunmute = () => goLive();
    };
    const onState = () => {
      const st = p.connectionState ?? p.iceConnectionState;
      const ice = p.iceConnectionState;
      if (st === "connected" || ice === "connected" || ice === "completed") {
        lostSince.current = null;
        goLive();
        return;
      }
      if (st === "failed" || ice === "failed" || ice === "disconnected") {
        // Don't drop the call on a blip: show "Reconnecting…" and try fresh
        // network paths (relay included) for up to 30 s before giving up.
        if (callRef.current?.phase !== "live" && callRef.current?.phase !== "connecting") return;
        if (lostSince.current === null) lostSince.current = Date.now();
        update({ reconnecting: true });
        if (Date.now() - lostSince.current > RECONNECT_FOR) {
          send("call:end", { id, reason: "failed" });
          cleanup("failed");
          return;
        }
        const wait = ice === "disconnected" ? 2500 : 0;
        setTimeout(() => {
          if (pc.current !== p) return;
          const now = p.iceConnectionState;
          if (now === "connected" || now === "completed") return;
          void restartIce();
          // Keep checking until it's back or the 30 s run out.
          setTimeout(() => pc.current === p && onState(), 5000);
        }, wait);
      }
    };
    p.onconnectionstatechange = onState;
    p.oniceconnectionstatechange = onState;
    pc.current = p;
    return p;
  };

  const flushIce = async () => {
    const p = pc.current;
    if (!p?.remoteDescription) return;
    for (const c of pendingIce.current.splice(0)) await p.addIceCandidate(c).catch(() => undefined);
  };

  /* ------------------------------------------------------------- incoming */
  const accept = useCallback(
    async (reuse?: MediaStream | null) => {
      const c = callRef.current;
      if (!c || c.phase !== "incoming") return;
      stopRinging();
      update({ phase: "connecting" });
      try {
        const s =
          reuse && reuse.getTracks().some((t) => t.readyState === "live")
            ? reuse
            : await getMedia(c.video);
        await makePeer(c.id, s);
        send("call:accept", { id: c.id, by: me.id });
      } catch {
        send("call:end", { id: c.id, reason: "declined" });
        cleanup("media");
      }
    },
    // makePeer and getMedia read only refs and stable setters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [send, update, cleanup, me.id],
  );

  /* ------------------------------------------------------------- outgoing */
  const start = useCallback(
    async (video: boolean) => {
      if (callRef.current) {
        // Their call reached us a moment before our tap: calling them back means yes.
        if (callRef.current.phase === "incoming") void accept();
        return;
      }
      if (!navigator.mediaDevices?.getUserMedia || typeof RTCPeerConnection === "undefined")
        return toast.err("This browser can't make calls. Try Chrome or Safari.");
      const id = crypto.randomUUID();
      const base = baseState(id, video, "outgoing");
      callRef.current = base;
      setCall(base);
      iCalled.current = true;
      try {
        await getMedia(video);
      } catch {
        cleanup("media");
        return;
      }
      if (callRef.current?.id !== id) {
        // While the camera started, they called too and their call won (or this
        // one ended). Never announce ours now: it would knock out the real call.
        if (pendingMerge.current) {
          pendingMerge.current = false;
          void accept(localRef.current);
        } else if (!callRef.current) {
          localRef.current?.getTracks().forEach((t) => t.stop());
          localRef.current = null;
          setLocal(null);
        }
        return;
      }
      send("call:ring", { id, video });
      // Keep announcing while it rings, so a partner who opens Clink from the
      // notification (or a second device) picks the call up straight away.
      reannounce.current = setInterval(() => {
        if (callRef.current?.phase === "outgoing") send("call:ring", { id, video });
      }, 3000);
      void fetch("/api/calls/ring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, video }),
      }).catch(() => undefined);
      startTone("ringback");
      ringTimer.current = setTimeout(() => {
        if (callRef.current?.phase === "outgoing") {
          send("call:end", { id, reason: "missed" });
          cleanup("missed");
        }
      }, RING_TIMEOUT);
    },

    [send, cleanup, accept],
  );

  useCoupleEvent("call:ring", (p) => {
    const id = String(p.id);
    const cur = callRef.current;
    if (cur?.id === id) return;
    if (cur && cur.phase === "outgoing") {
      // We called each other at the same moment. Don't say "busy": join into
      // one call. The call with the smaller id wins; the other side answers it.
      if (id < cur.id) {
        stopRinging();
        iCalled.current = false;
        const keep = localRef.current;
        const merged: CallState = { ...cur, id, video: cur.video || Boolean(p.video) };
        callRef.current = { ...merged, phase: "incoming" };
        setCall(callRef.current);
        // Still starting our camera? start() answers as soon as it's ready.
        if (keep) void accept(keep);
        else pendingMerge.current = true;
      }
      return;
    }
    if (cur && cur.phase !== "ended") {
      // Already connected and they ring again: their side dropped. Take the new call.
      pc.current?.close();
      pc.current = null;
      localRef.current?.getTracks().forEach((t) => t.stop());
      localRef.current = null;
      setLocal(null);
      setRemote(null);
      stopRinging();
    }
    iCalled.current = false;
    const next = baseState(id, Boolean(p.video), "incoming");
    callRef.current = next;
    setCall(next);
    // Opened from the notification's Answer: no second tap needed.
    if (pendingAnswer.current === id) {
      pendingAnswer.current = null;
      void accept();
      return;
    }
    startTone("ringtone");
    haptic([300, 200, 300, 200, 300]);
    ringTone.current = setInterval(() => haptic([300, 200, 300]), 2200);
    ringTimer.current = setTimeout(() => {
      if (callRef.current?.phase === "incoming") cleanup("missed");
    }, RING_TIMEOUT);
  });

  const decline = useCallback(() => {
    const c = callRef.current;
    if (!c) return;
    send("call:end", { id: c.id, reason: "declined" });
    cleanup("local");
  }, [send, cleanup]);

  const hangUp = useCallback(() => {
    const c = callRef.current;
    if (!c) return;
    send("call:end", { id: c.id, reason: "ended" });
    playHangupTone();
    cleanup("local");
  }, [send, cleanup]);

  /* ------------------------------------------------------------ signalling */
  useCoupleEvent("call:accept", async (p) => {
    const c = callRef.current;
    if (!c || p.id !== c.id) return;
    // You answered on another of your devices: stop ringing here.
    if (p.by === me.id) {
      if (c.phase === "incoming") cleanup("local");
      return;
    }
    if (c.phase !== "outgoing" || !localRef.current) return;
    stopRinging();
    update({ phase: "connecting" });
    const peer = await makePeer(c.id, localRef.current);
    const offer = await peer.createOffer();
    await peer.setLocalDescription({ type: "offer", sdp: tuneSdp(offer.sdp) });
    send("call:sdp", { id: c.id, sdp: peer.localDescription?.toJSON() });
  });

  useCoupleEvent("call:sdp", async (p) => {
    const c = callRef.current;
    const peer = pc.current;
    if (!c || p.id !== c.id || !peer) return;
    const desc = p.sdp as RTCSessionDescriptionInit;
    if (desc.type === "offer" && peer.signalingState !== "stable") {
      // Both sides renegotiated at once: the caller's offer wins, the callee rolls back.
      if (iCalled.current) return;
      await peer.setLocalDescription({ type: "rollback" });
    }
    await peer.setRemoteDescription(desc);
    await flushIce();
    if (desc.type === "offer") {
      const answer = await peer.createAnswer();
      await peer.setLocalDescription({ type: "answer", sdp: tuneSdp(answer.sdp) });
      send("call:sdp", { id: c.id, sdp: peer.localDescription?.toJSON() });
    }
  });

  useCoupleEvent("call:ice", async (p) => {
    const c = callRef.current;
    if (!c || p.id !== c.id) return;
    const cand = p.candidate as RTCIceCandidateInit;
    if (pc.current?.remoteDescription)
      await pc.current.addIceCandidate(cand).catch(() => undefined);
    else pendingIce.current.push(cand);
  });

  useCoupleEvent("call:end", (p) => {
    const c = callRef.current;
    if (!c || p.id !== c.id) return;
    const reason = String(p.reason ?? "ended");
    cleanup(reason === "busy" ? "declined" : reason);
  });

  // Floating reactions, mine and theirs; each drifts away after a moment.
  const addReaction = (emoji: string, mine: boolean) => {
    const key = crypto.randomUUID();
    setReactions((r) => [...r.slice(-11), { key, emoji, mine }]);
    setTimeout(() => setReactions((r) => r.filter((x) => x.key !== key)), 2600);
  };

  // Their page reloaded mid-call: hold the call and wait for them to come back.
  const awayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useCoupleEvent("call:away", (p) => {
    const c = callRef.current;
    if (!c || p.id !== c.id) return;
    update({ reconnecting: true });
    if (awayTimer.current) clearTimeout(awayTimer.current);
    awayTimer.current = setTimeout(() => {
      awayTimer.current = null;
      if (callRef.current?.id === c.id && callRef.current.reconnecting) cleanup("ended");
    }, RESUME_FOR + 3000);
  });

  // They're back: a fresh connection on the same call, their offer, our answer.
  useCoupleEvent("call:resume", async (p) => {
    const c = callRef.current;
    if (!c || p.id !== c.id || !localRef.current) return;
    if (awayTimer.current) clearTimeout(awayTimer.current);
    awayTimer.current = null;
    if (monitor.current) clearInterval(monitor.current);
    monitor.current = null;
    pc.current?.close();
    pc.current = null;
    pendingIce.current = [];
    const peer = await makePeer(c.id, localRef.current);
    await peer.setRemoteDescription(p.sdp as RTCSessionDescriptionInit);
    await flushIce();
    const answer = await peer.createAnswer();
    await peer.setLocalDescription({ type: "answer", sdp: tuneSdp(answer.sdp) });
    send("call:sdp", { id: c.id, sdp: peer.localDescription?.toJSON() });
  });

  useCoupleEvent("call:wake", (p) => {
    const c = callRef.current;
    if (c && p.id === c.id && c.phase === "outgoing")
      send("call:ring", { id: c.id, video: c.video });
  });

  useCoupleEvent("call:restart", (p) => {
    if (callRef.current && p.id === callRef.current.id && iCalled.current) void restartIce();
  });

  useCoupleEvent("call:mute", (p) => {
    if (callRef.current && p.id === callRef.current.id) update({ remoteMuted: Boolean(p.muted) });
  });

  useCoupleEvent("call:videopause", (p) => {
    if (callRef.current && p.id === callRef.current.id)
      update({ remoteVideoPaused: Boolean(p.paused) });
  });

  useCoupleEvent("call:video", (p) => {
    // They turned their camera on in a voice call: this becomes a video call.
    if (callRef.current && p.id === callRef.current.id && !callRef.current.video)
      update({ video: true, cameraOff: true, speaker: true });
  });

  useCoupleEvent("call:react", (p) => {
    if (callRef.current && p.id === callRef.current.id) addReaction(String(p.e), false);
  });

  useCoupleEvent("call:camera", (p) => {
    if (callRef.current && p.id === callRef.current.id) update({ remoteCameraOff: Boolean(p.off) });
  });

  /* -------------------------------------------------------------- controls */
  const toggleMute = useCallback(() => {
    const c = callRef.current;
    if (!c) return;
    localRef.current?.getAudioTracks().forEach((t) => (t.enabled = c.muted));
    send("call:mute", { id: c.id, muted: !c.muted });
    update({ muted: !c.muted });
    haptic("select");
  }, [send, update]);

  const toggleCamera = useCallback(() => {
    const c = callRef.current;
    if (!c) return;
    localRef.current?.getVideoTracks().forEach((t) => (t.enabled = c.cameraOff));
    send("call:camera", { id: c.id, off: !c.cameraOff });
    update({ cameraOff: !c.cameraOff });
    haptic("select");
  }, [send, update]);

  const flipCamera = useCallback(async () => {
    const c = callRef.current;
    if (!c?.video) return;
    const facing = c.facing === "user" ? "environment" : "user";
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing } });
      const track = s.getVideoTracks()[0]!;
      const sender = pc.current?.getSenders().find((x) => x.track?.kind === "video");
      await sender?.replaceTrack(track);
      const old = localRef.current?.getVideoTracks()[0];
      if (old && localRef.current) {
        localRef.current.removeTrack(old);
        old.stop();
        localRef.current.addTrack(track);
        setLocal(new MediaStream(localRef.current.getTracks()));
      }
      update({ facing });
    } catch {
      toast.err("Couldn't switch camera.");
    }
  }, [update]);

  const toggleSpeaker = useCallback(() => {
    const c = callRef.current;
    if (!c) return;
    update({ speaker: !c.speaker });
    haptic("select");
  }, [update]);

  const react = useCallback(
    (emoji: string) => {
      const c = callRef.current;
      if (!c) return;
      send("call:react", { id: c.id, e: emoji });
      addReaction(emoji, true);
      haptic("tap");
    },
    [send],
  );

  /** Voice to video mid-call (or camera back on): add a camera track and renegotiate. */
  const upgradeToVideo = useCallback(async () => {
    const c = callRef.current;
    const p = pc.current;
    if (!c || !p) return;
    const existing = localRef.current?.getVideoTracks()[0];
    if (existing && existing.readyState === "live") {
      existing.enabled = true;
      send("call:camera", { id: c.id, off: false });
      update({ cameraOff: false, video: true });
      return;
    }
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: c.facing, width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      const track = s.getVideoTracks()[0]!;
      const stream = localRef.current ?? new MediaStream();
      stream.addTrack(track);
      localRef.current = stream;
      setLocal(new MediaStream(stream.getTracks()));
      const free = p
        .getTransceivers()
        .find((t) => t.receiver.track.kind === "video" && !t.sender.track);
      if (free) {
        await free.sender.replaceTrack(track);
        free.direction = "sendrecv";
      } else p.addTrack(track, stream);
      const offer = await p.createOffer();
      await p.setLocalDescription({ type: "offer", sdp: tuneSdp(offer.sdp) });
      send("call:sdp", { id: c.id, sdp: p.localDescription?.toJSON() });
      send("call:video", { id: c.id });
      send("call:camera", { id: c.id, off: false });
      update({ video: true, cameraOff: false, speaker: true });
      void prioritise(p);
    } catch {
      toast.err("Couldn't turn your camera on.");
    }
  }, [send, update]);

  // A new network (Wi-Fi to mobile data, back online): find a fresh path now
  // rather than waiting for the old one to time out.
  useEffect(() => {
    const onNet = () => {
      const c = callRef.current;
      if (c && (c.phase === "live" || c.phase === "connecting")) void restartIce();
    };
    window.addEventListener("online", onNet);
    const conn = (navigator as Navigator & { connection?: EventTarget }).connection;
    conn?.addEventListener?.("change", onNet);
    return () => {
      window.removeEventListener("online", onNet);
      conn?.removeEventListener?.("change", onNet);
    };
    // restartIce reads refs only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reloads (a new version, a stale screen) wait while a call is up.
  useEffect(() => {
    setCallActive(Boolean(call && call.phase !== "ended"));
  }, [call]);
  useEffect(() => () => setCallActive(false), []);

  // Back from a reload mid-call: pick the same call up again, as soon as the
  // couple channel is connected so they hear about it.
  const resumed = useRef(false);
  useEffect(() => {
    if (!connected || resumed.current) return;
    resumed.current = true;
    let r: Resume | null = null;
    try {
      r = JSON.parse(sessionStorage.getItem(RESUME_KEY) ?? "null") as Resume | null;
      sessionStorage.removeItem(RESUME_KEY);
    } catch {
      r = null;
    }
    if (!r || callRef.current || nowMs() - r.at > RESUME_FOR) return;
    const back = r;
    void (async () => {
      const state: CallState = {
        ...baseState(back.id, back.video, "live"),
        startedAt: back.startedAt ?? nowMs(),
        muted: back.muted,
        reconnecting: true,
      };
      callRef.current = state;
      setCall(state);
      iCalled.current = back.iCalled;
      try {
        const stream = await getMedia(back.video);
        if (back.muted) stream.getAudioTracks().forEach((t) => (t.enabled = false));
        const peer = await makePeer(back.id, stream);
        const offer = await peer.createOffer();
        await peer.setLocalDescription({ type: "offer", sdp: tuneSdp(offer.sdp) });
        send("call:resume", { id: back.id, sdp: peer.localDescription?.toJSON() });
        if (back.muted) send("call:mute", { id: back.id, muted: true });
      } catch {
        send("call:end", { id: back.id, reason: "ended" });
        cleanup("media");
      }
    })();
    // Runs once, when the channel first connects; the helpers read refs only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected]);

  // The page is going away mid-call (closed, or reloaded for a new version).
  // A call that's up is handed over: we note it, tell them we'll be right
  // back, and a reloaded page picks it up again (see "resume" below). If we
  // don't come back, their side ends it after a short wait. A call still
  // ringing just ends.
  useEffect(() => {
    const bye = () => {
      const c = callRef.current;
      if (!c) return;
      if ((c.phase === "live" || c.phase === "connecting") && pc.current) {
        try {
          const r: Resume = {
            id: c.id,
            video: c.video && !c.cameraOff,
            startedAt: c.startedAt,
            iCalled: iCalled.current,
            muted: c.muted,
            at: nowMs(),
          };
          sessionStorage.setItem(RESUME_KEY, JSON.stringify(r));
        } catch {
          /* storage blocked: it just ends */
        }
        send("call:away", { id: c.id });
      } else send("call:end", { id: c.id, reason: "ended" });
    };
    window.addEventListener("pagehide", bye);
    return () => window.removeEventListener("pagehide", bye);
  }, [send]);

  return (
    <Ctx.Provider
      value={{
        call,
        local,
        remote,
        start,
        accept: () => void accept(),
        decline,
        hangUp,
        toggleMute,
        toggleCamera,
        flipCamera,
        toggleSpeaker,
        upgradeToVideo: () => void upgradeToVideo(),
        react,
        reactions,
      }}
    >
      {children}
      {call && (
        <CallScreen
          partnerName={partner.name}
          partnerPhoto={partner.avatarUrl}
          partnerIcon={partner.avatarIcon}
          partnerOnline={presence.online}
          endMessage={
            call.endReason ? (ENDED_MESSAGES[call.endReason] ?? ENDED_MESSAGES.ended!) : null
          }
        />
      )}
    </Ctx.Provider>
  );
}
