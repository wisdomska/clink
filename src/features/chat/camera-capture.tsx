"use client";
import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { CameraRotate, X, Lightning } from "@phosphor-icons/react";
import { feedback } from "@/lib/feedback";
import { cn } from "@/components/ui/cn";

const MAX_VIDEO_S = 60;

/**
 * Instant camera: tap the shutter for a photo, hold it for a video (up to
 * 60 s). Shots go straight into the editor, so you can still add text,
 * filters or more shots before sending.
 */
export function CameraCapture({
  onClose,
  onShot,
  onFallback,
}: {
  onClose: () => void;
  onShot: (file: File) => void;
  /** No camera access: fall back to the device's own camera picker. */
  onFallback: () => void;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const rec = useRef<MediaRecorder | null>(null);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [facing, setFacing] = useState<"user" | "environment">("environment");
  const [ready, setReady] = useState(false);
  const [recording, setRecording] = useState(false);
  const [secs, setSecs] = useState(0);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    let off = false;
    (async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: true,
        });
        if (off) return s.getTracks().forEach((t) => t.stop());
        stream.current?.getTracks().forEach((t) => t.stop());
        stream.current = s;
        if (video.current) video.current.srcObject = s;
        setReady(true);
      } catch {
        if (!off) onFallback();
      }
    })();
    return () => {
      off = true;
    };
  }, [facing, onFallback]);

  useEffect(
    () => () => {
      stream.current?.getTracks().forEach((t) => t.stop());
      if (holdTimer.current) clearTimeout(holdTimer.current);
    },
    [],
  );

  useEffect(() => {
    if (!recording) return;
    const t = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [recording]);
  useEffect(() => {
    if (secs >= MAX_VIDEO_S) stopVideo();
  });

  const photo = async () => {
    const v = video.current;
    if (!v || !v.videoWidth) return;
    const c = document.createElement("canvas");
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    const ctx = c.getContext("2d")!;
    if (facing === "user") {
      ctx.translate(c.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(v, 0, 0);
    setFlash(true);
    feedback("tap", "flip");
    const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/jpeg", 0.92));
    if (blob) onShot(new File([blob], `clink-${Date.now()}.jpg`, { type: "image/jpeg" }));
  };

  const startVideo = () => {
    if (!stream.current || typeof MediaRecorder === "undefined") return;
    const types = [
      "video/mp4;codecs=avc1",
      "video/mp4",
      "video/webm;codecs=vp9,opus",
      "video/webm",
    ];
    const mimeType = types.find((t) => MediaRecorder.isTypeSupported(t));
    const r = new MediaRecorder(stream.current, mimeType ? { mimeType } : undefined);
    const chunks: Blob[] = [];
    r.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    r.onstop = () => {
      const type = (r.mimeType || "video/webm").split(";")[0]!;
      const ext = type.includes("mp4") ? "mp4" : "webm";
      const blob = new Blob(chunks, { type });
      if (blob.size) onShot(new File([blob], `clink-${Date.now()}.${ext}`, { type }));
    };
    r.start(250);
    rec.current = r;
    setSecs(0);
    setRecording(true);
    feedback("select");
  };

  function stopVideo() {
    if (rec.current?.state === "recording") rec.current.stop();
    rec.current = null;
    setRecording(false);
  }

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label="Camera"
      className="fixed inset-0 z-[85] flex flex-col bg-black text-white"
      initial={{ opacity: 0.01 }}
      animate={{ opacity: 1 }}
    >
      <video
        ref={video}
        autoPlay
        playsInline
        muted
        className={cn(
          "absolute inset-0 h-full w-full object-cover",
          facing === "user" && "-scale-x-100",
        )}
      />
      {flash && (
        <motion.div
          className="pointer-events-none absolute inset-0 bg-white"
          initial={{ opacity: 0.9 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          onAnimationComplete={() => setFlash(false)}
        />
      )}
      <div className="relative flex items-center justify-between px-4 pt-[calc(env(safe-area-inset-top)+10px)]">
        <button
          type="button"
          aria-label="Close camera"
          onClick={onClose}
          className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border-0 bg-black/40 text-white backdrop-blur"
        >
          <X size={22} />
        </button>
        {recording && (
          <span className="mono flex items-center gap-2 rounded-full bg-black/50 px-3 py-1.5 text-sm">
            <span className="an-dot bg-danger h-2.5 w-2.5 rounded-full" aria-hidden />
            {Math.floor(secs / 60)}:{String(secs % 60).padStart(2, "0")}
          </span>
        )}
        <span className="w-11" />
      </div>
      <div className="flex-1" />
      {recording && (
        <div
          className="relative mx-8 mb-5 h-1.5 overflow-hidden rounded-full bg-white/25"
          aria-hidden
        >
          <div
            className="bg-danger h-full rounded-full transition-[width] duration-1000 ease-linear"
            style={{ width: `${(secs / MAX_VIDEO_S) * 100}%` }}
          />
        </div>
      )}
      <div className="relative flex items-center justify-around px-8 pb-[calc(env(safe-area-inset-bottom)+28px)]">
        <span className="w-12 text-center text-xs text-white/70">
          {ready ? (
            recording ? (
              "Release to stop"
            ) : (
              "Tap: photo\nHold: video"
            )
          ) : (
            <Lightning size={20} />
          )}
        </span>
        <motion.button
          type="button"
          aria-label={recording ? "Stop recording" : "Take photo (hold for video)"}
          disabled={!ready}
          whileTap={{ scale: 0.9 }}
          onPointerDown={() => {
            holdTimer.current = setTimeout(() => {
              holdTimer.current = null;
              startVideo();
            }, 350);
          }}
          onPointerUp={() => {
            if (holdTimer.current) {
              clearTimeout(holdTimer.current);
              holdTimer.current = null;
              void photo();
            } else if (recording) stopVideo();
          }}
          onPointerCancel={() => recording && stopVideo()}
          onContextMenu={(e) => e.preventDefault()}
          className="relative flex h-20 w-20 cursor-pointer touch-none items-center justify-center rounded-full border-0 bg-white/25 p-0 backdrop-blur select-none"
        >
          <motion.span
            className={cn("block rounded-full", recording ? "bg-danger" : "bg-white")}
            animate={
              recording
                ? { width: 34, height: 34, borderRadius: 10 }
                : { width: 64, height: 64, borderRadius: 999 }
            }
            transition={{ type: "spring", stiffness: 400, damping: 26 }}
          />
        </motion.button>
        <button
          type="button"
          aria-label="Flip camera"
          disabled={recording}
          onClick={() => {
            setReady(false);
            setFacing((f) => (f === "user" ? "environment" : "user"));
          }}
          className="flex h-12 w-12 cursor-pointer items-center justify-center rounded-full border-0 bg-black/40 text-white backdrop-blur disabled:opacity-40"
        >
          <CameraRotate size={24} />
        </button>
      </div>
    </motion.div>
  );
}
