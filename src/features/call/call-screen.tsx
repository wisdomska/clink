"use client";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  CaretDown,
  CameraRotate,
  Microphone,
  MicrophoneSlash,
  Phone,
  PhoneDisconnect,
  VideoCamera,
  VideoCameraSlash,
} from "@phosphor-icons/react";
import { Avatar, type AvatarIcon } from "@/components/ui/avatar";
import { LoadingDots } from "@/components/ui/spinner";
import { cn } from "@/components/ui/cn";
import { useCall } from "./call-provider";

function Video({
  stream,
  muted,
  mirror,
  className,
}: {
  stream: MediaStream | null;
  muted?: boolean;
  mirror?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (v.srcObject !== stream) v.srcObject = stream;
    // Explicit play: autoplay alone is flaky for live streams on phones.
    void v.play().catch(() => undefined);
  }, [stream]);
  return (
    <video
      ref={ref}
      autoPlay
      playsInline
      // Sound always comes from the <audio> element; video stays muted so it can autoplay.
      muted={muted ?? true}
      className={cn("object-cover", mirror && "-scale-x-100", className)}
    />
  );
}

function Elapsed({ since }: { since: number }) {
  const [now, setNow] = useState(since);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const s = Math.max(0, Math.floor((now - since) / 1000));
  return (
    <span className="mono">
      {Math.floor(s / 60)}:{String(s % 60).padStart(2, "0")}
    </span>
  );
}

function RoundBtn({
  label,
  onClick,
  tone = "glass",
  children,
  on,
}: {
  label: string;
  onClick: () => void;
  tone?: "glass" | "danger" | "go";
  children: React.ReactNode;
  on?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <motion.button
        type="button"
        aria-label={label}
        aria-pressed={on}
        whileTap={{ scale: 0.94, transition: { duration: 0.06 } }}
        onClick={onClick}
        className={cn(
          "flex h-16 w-16 cursor-pointer items-center justify-center rounded-full border-0 text-white",
          tone === "danger" && "bg-[#FF3B30]",
          tone === "go" && "bg-[#34C759]",
          tone === "glass" && (on ? "bg-white text-black" : "bg-s3"),
        )}
      >
        {children}
      </motion.button>
      <span className="text-xs font-medium text-white/80">{label}</span>
    </div>
  );
}

/** Full-screen call UI: ringing, connecting, live (voice or video), ended. */
export function CallScreen({
  partnerName,
  partnerPhoto,
  partnerIcon,
  partnerOnline,
  endMessage,
}: {
  partnerName: string;
  partnerPhoto: string | null;
  partnerIcon: AvatarIcon | null;
  partnerOnline: boolean;
  endMessage: string | null;
}) {
  const { call, local, remote, accept, decline, hangUp, toggleMute, toggleCamera, flipCamera } =
    useCall();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [mini, setMini] = useState(false);
  const [needsTap, setNeedsTap] = useState(false);
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    if (a.srcObject !== remote) a.srcObject = remote;
    if (!remote) return;
    // If the browser blocks sound until a tap, offer one instead of silence.
    void a
      .play()
      .then(() => setNeedsTap(false))
      .catch(() => setNeedsTap(true));
  }, [remote, mini]);
  if (!call) return null;
  const live = call.phase === "live";

  // Minimised: a floating pill over the app, so you can chat or play mid-call.
  if (mini && call.phase !== "incoming" && call.phase !== "ended") {
    return (
      <motion.div
        role="status"
        aria-label={`On a call with ${partnerName}`}
        className="fixed top-[calc(env(safe-area-inset-top)+8px)] left-1/2 z-[90] flex -translate-x-1/2 items-center gap-1 rounded-full bg-[#34C759] p-1 pl-1 text-white shadow-[0_8px_24px_rgba(0,0,0,.35)]"
        initial={{ y: -40, opacity: 0.01 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
      >
        <audio ref={audioRef} autoPlay />
        <button
          type="button"
          onClick={() => setMini(false)}
          className="press flex h-11 cursor-pointer items-center gap-2 rounded-full border-0 bg-transparent px-3 text-sm font-bold text-white"
        >
          {call.video ? (
            <VideoCamera size={20} weight="fill" aria-hidden />
          ) : (
            <Phone size={20} weight="fill" aria-hidden />
          )}
          {partnerName}
          {live && call.startedAt ? <Elapsed since={call.startedAt} /> : <LoadingDots />}
        </button>
        <button
          type="button"
          aria-label="End call"
          onClick={hangUp}
          className="press-icon flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border-0 bg-[#FF3B30] text-white"
        >
          <PhoneDisconnect size={20} weight="fill" aria-hidden />
        </button>
      </motion.div>
    );
  }
  // Show their picture as soon as it arrives, not only once the call reports "live".
  const showRemoteVideo =
    call.video &&
    call.phase !== "incoming" &&
    call.phase !== "ended" &&
    Boolean(remote?.getVideoTracks().length) &&
    !call.remoteCameraOff;

  const status =
    call.phase === "outgoing"
      ? partnerOnline
        ? "Ringing"
        : "Calling"
      : call.phase === "incoming"
        ? `Incoming ${call.video ? "video" : "voice"} call`
        : call.phase === "connecting"
          ? "Connecting"
          : call.phase === "ended"
            ? endMessage
            : null;

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={`${call.video ? "Video" : "Voice"} call with ${partnerName}`}
      className="bg-app fixed inset-0 z-[90] flex flex-col overflow-hidden text-white"
      initial={{ opacity: 0.01, scale: 1.03 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <audio ref={audioRef} autoPlay />
      {call.phase !== "incoming" && call.phase !== "ended" && (
        <button
          type="button"
          aria-label="Minimise call"
          onClick={() => setMini(true)}
          className="bg-s3 absolute top-[calc(env(safe-area-inset-top)+12px)] left-4 z-10 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border-0 text-white"
        >
          <CaretDown size={22} weight="bold" />
        </button>
      )}
      {showRemoteVideo && <Video stream={remote} className="absolute inset-0 h-full w-full" />}
      {showRemoteVideo && (
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/60 to-transparent" />
      )}

      <div
        className={cn(
          "relative flex flex-col items-center gap-3 px-6 pt-[calc(env(safe-area-inset-top)+48px)] text-center",
          showRemoteVideo && "pt-[calc(env(safe-area-inset-top)+20px)]",
        )}
      >
        {!showRemoteVideo && (
          <motion.div
            animate={
              call.phase === "incoming" || call.phase === "outgoing"
                ? { scale: [1, 1.06, 1] }
                : { scale: 1 }
            }
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
            className="rounded-full"
          >
            <Avatar
              name={partnerName}
              side="partner"
              size={128}
              ring={0}
              photoUrl={partnerPhoto}
              icon={partnerIcon}
            />
          </motion.div>
        )}
        <div className={cn("display", showRemoteVideo ? "text-[22px]" : "text-[34px]")}>
          {partnerName}
        </div>
        <div className="flex items-center gap-2 text-base text-white/80" aria-live="polite">
          {live && call.startedAt ? (
            <Elapsed since={call.startedAt} />
          ) : (
            <>
              {status}
              {(call.phase === "outgoing" || call.phase === "connecting") && <LoadingDots />}
            </>
          )}
        </div>
        {needsTap && remote && (
          <button
            type="button"
            onClick={() => {
              void audioRef.current?.play().then(() => setNeedsTap(false));
            }}
            className="press mt-2 cursor-pointer rounded-full border-0 bg-white px-4 py-2 text-sm font-bold text-black"
          >
            Tap to hear {partnerName}
          </button>
        )}
        {live && call.video && call.remoteCameraOff && (
          <div className="text-sm text-white/70">{partnerName}&apos;s camera is off</div>
        )}
      </div>

      <AnimatePresence>
        {call.video && local && !call.cameraOff && call.phase !== "incoming" && (
          <motion.div
            drag
            dragMomentum={false}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className={cn(
              "absolute overflow-hidden rounded-[14px] shadow-[0_8px_24px_rgba(0,0,0,.35)]",
              live || showRemoteVideo
                ? "top-[calc(env(safe-area-inset-top)+16px)] right-4 z-[2] h-44 w-28 cursor-grab"
                : "inset-0 rounded-none opacity-40",
            )}
          >
            <Video stream={local} muted mirror={call.facing === "user"} className="h-full w-full" />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1" />

      <div className="relative px-6 pb-[calc(env(safe-area-inset-bottom)+36px)]">
        {call.phase === "incoming" ? (
          <div className="flex items-center justify-around">
            <RoundBtn label="Decline" tone="danger" onClick={decline}>
              <PhoneDisconnect size={28} weight="fill" />
            </RoundBtn>
            <RoundBtn label="Accept" tone="go" onClick={accept}>
              {call.video ? (
                <VideoCamera size={28} weight="fill" />
              ) : (
                <Phone size={28} weight="fill" />
              )}
            </RoundBtn>
          </div>
        ) : call.phase === "ended" ? null : (
          <div className="flex items-center justify-center gap-5">
            <RoundBtn label={call.muted ? "Unmute" : "Mute"} on={call.muted} onClick={toggleMute}>
              {call.muted ? (
                <MicrophoneSlash size={26} weight="fill" />
              ) : (
                <Microphone size={26} weight="fill" />
              )}
            </RoundBtn>
            {call.video && (
              <RoundBtn
                label={call.cameraOff ? "Camera on" : "Camera off"}
                on={call.cameraOff}
                onClick={toggleCamera}
              >
                {call.cameraOff ? (
                  <VideoCameraSlash size={26} weight="fill" />
                ) : (
                  <VideoCamera size={26} weight="fill" />
                )}
              </RoundBtn>
            )}
            {call.video && (
              <RoundBtn label="Flip" onClick={() => void flipCamera()}>
                <CameraRotate size={26} weight="fill" />
              </RoundBtn>
            )}
            <RoundBtn label="End" tone="danger" onClick={hangUp}>
              <PhoneDisconnect size={28} weight="fill" />
            </RoundBtn>
          </div>
        )}
      </div>
    </motion.div>
  );
}
