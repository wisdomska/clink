"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useCouple, useCoupleEvent } from "@/features/couple/context";
import { toast } from "@/components/ui/toast";
import { haptic, playSound } from "@/lib/feedback";
import { iceServers } from "./ice";
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
}

const Ctx = createContext<CallApi | null>(null);
export const useCall = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error("useCall outside CallProvider");
  return v;
};

const RING_TIMEOUT = 45_000;
const ENDED_MESSAGES: Record<string, string> = {
  declined: "They can't pick up right now.",
  busy: "They're on another call.",
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
  const { send, partner, presence } = useCouple();
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
    ringTimer.current = null;
    ringTone.current = null;
  };

  const cleanup = useCallback(
    (reason: string | null) => {
      stopRinging();
      pc.current?.close();
      pc.current = null;
      localRef.current?.getTracks().forEach((t) => t.stop());
      localRef.current = null;
      pendingIce.current = [];
      setLocal(null);
      setRemote(null);
      if (!callRef.current) return;
      if (reason !== "media") logCall(callRef.current, reason);
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

  const makePeer = (id: string, stream: MediaStream) => {
    const p = new RTCPeerConnection({ iceServers: iceServers() });
    stream.getTracks().forEach((t) => p.addTrack(t, stream));
    p.onicecandidate = (e) =>
      e.candidate && send("call:ice", { id, candidate: e.candidate.toJSON() });
    p.ontrack = (e) => setRemote(e.streams[0] ?? new MediaStream([e.track]));
    p.onconnectionstatechange = () => {
      if (p.connectionState === "connected") {
        update({ phase: "live", startedAt: callRef.current?.startedAt ?? Date.now() });
        haptic("success");
      } else if (p.connectionState === "failed") {
        send("call:end", { id, reason: "failed" });
        cleanup("failed");
      }
    };
    pc.current = p;
    return p;
  };

  const flushIce = async () => {
    const p = pc.current;
    if (!p?.remoteDescription) return;
    for (const c of pendingIce.current.splice(0)) await p.addIceCandidate(c).catch(() => undefined);
  };

  /* ------------------------------------------------------------- outgoing */
  const start = useCallback(
    async (video: boolean) => {
      if (callRef.current) return;
      if (!navigator.mediaDevices?.getUserMedia || typeof RTCPeerConnection === "undefined")
        return toast.err("This browser can't make calls. Try Chrome or Safari.");
      const id = crypto.randomUUID();
      const base: CallState = {
        id,
        video,
        phase: "outgoing",
        startedAt: null,
        muted: false,
        cameraOff: false,
        facing: "user",
        remoteCameraOff: false,
        endReason: null,
      };
      callRef.current = base;
      setCall(base);
      iCalled.current = true;
      try {
        await getMedia(video);
      } catch {
        cleanup("media");
        return;
      }
      send("call:ring", { id, video });
      void fetch("/api/calls/ring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ video }),
      }).catch(() => undefined);
      ringTone.current = setInterval(() => playSound("tick"), 1800);
      ringTimer.current = setTimeout(() => {
        if (callRef.current?.phase === "outgoing") {
          send("call:end", { id, reason: "missed" });
          cleanup("missed");
        }
      }, RING_TIMEOUT);
    },

    [send, cleanup],
  );

  /* ------------------------------------------------------------- incoming */
  useCoupleEvent("call:ring", (p) => {
    const id = String(p.id);
    if (!callRef.current) iCalled.current = false;
    if (callRef.current) {
      send("call:end", { id, reason: "busy" });
      return;
    }
    const next: CallState = {
      id,
      video: Boolean(p.video),
      phase: "incoming",
      startedAt: null,
      muted: false,
      cameraOff: false,
      facing: "user",
      remoteCameraOff: false,
      endReason: null,
    };
    callRef.current = next;
    setCall(next);
    haptic([300, 200, 300, 200, 300]);
    ringTone.current = setInterval(() => {
      playSound("clink");
      haptic([300, 200, 300]);
    }, 2200);
    ringTimer.current = setTimeout(() => {
      if (callRef.current?.phase === "incoming") cleanup("missed");
    }, RING_TIMEOUT);
  });

  const accept = useCallback(async () => {
    const c = callRef.current;
    if (!c || c.phase !== "incoming") return;
    stopRinging();
    update({ phase: "connecting" });
    try {
      const s = await getMedia(c.video);
      makePeer(c.id, s);
      send("call:accept", { id: c.id });
    } catch {
      send("call:end", { id: c.id, reason: "declined" });
      cleanup("media");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [send, update, cleanup]);

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
    cleanup("local");
  }, [send, cleanup]);

  /* ------------------------------------------------------------ signalling */
  useCoupleEvent("call:accept", async (p) => {
    const c = callRef.current;
    if (!c || p.id !== c.id || c.phase !== "outgoing" || !localRef.current) return;
    stopRinging();
    update({ phase: "connecting" });
    const peer = makePeer(c.id, localRef.current);
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    send("call:sdp", { id: c.id, sdp: peer.localDescription?.toJSON() });
  });

  useCoupleEvent("call:sdp", async (p) => {
    const c = callRef.current;
    const peer = pc.current;
    if (!c || p.id !== c.id || !peer) return;
    const desc = p.sdp as RTCSessionDescriptionInit;
    await peer.setRemoteDescription(desc);
    await flushIce();
    if (desc.type === "offer") {
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
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
    cleanup(String(p.reason ?? "ended"));
  });

  useCoupleEvent("call:camera", (p) => {
    if (callRef.current && p.id === callRef.current.id) update({ remoteCameraOff: Boolean(p.off) });
  });

  /* -------------------------------------------------------------- controls */
  const toggleMute = useCallback(() => {
    const c = callRef.current;
    if (!c) return;
    localRef.current?.getAudioTracks().forEach((t) => (t.enabled = c.muted));
    update({ muted: !c.muted });
    haptic("select");
  }, [update]);

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

  // Hang up cleanly if the tab closes mid-call.
  useEffect(() => {
    const bye = () => {
      const c = callRef.current;
      if (c) send("call:end", { id: c.id, reason: "ended" });
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
        accept,
        decline,
        hangUp,
        toggleMute,
        toggleCamera,
        flipCamera,
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
