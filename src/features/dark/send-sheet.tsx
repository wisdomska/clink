"use client";
import { useEffect, useRef, useState } from "react";
import { X, UserFocus, PaintBrush, ImageSquare, DeviceMobileCamera } from "@phosphor-icons/react";
import { useQueryClient } from "@tanstack/react-query";
import { useCouple } from "@/features/couple/context";
import { Button, IconButton } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { uploadMedia } from "@/lib/media/upload";
import { prepareVideo } from "@/lib/media/video";
import { darkFetch, useDarkState } from "./api";

type Retention = "once" | "exp" | "vault";
interface FaceDetectorLike {
  detect(src: CanvasImageSource): Promise<Array<{ boundingBox: DOMRectReadOnly }>>;
}

/**
 * DARK-07 send sheet (+ DARK-09 face blur). Images are redrawn on a canvas,
 * which strips EXIF; blur is baked into the pixels before upload.
 */
export function SendSheet({
  open,
  onClose,
  spinId,
  requestId,
  onSent,
}: {
  open: boolean;
  onClose: () => void;
  spinId?: string;
  requestId?: string;
  onSent?: () => void;
}) {
  const { partner } = useCouple();
  const qc = useQueryClient();
  const { data: s } = useDarkState();
  const [file, setFile] = useState<File | null>(null);
  const [retention, setRetention] = useState<Retention>("once");
  const [expiry, setExpiry] = useState<"24h" | "7d">("24h");
  const [brush, setBrush] = useState(false);
  const [faceBlurred, setFaceBlurred] = useState(false);
  const [noticeDone, setNoticeDone] = useState(false);
  const notice = open && Boolean(s) && !s!.me.noticeSeen && !noticeDone;
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const canvas = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const painting = useRef(false);
  const isVideo = file?.type.startsWith("video");

  useEffect(() => {
    if (!file || isVideo || !canvas.current) return;
    let cancelled = false;
    void createImageBitmap(file, { imageOrientation: "from-image" }).then((bmp) => {
      if (cancelled || !canvas.current) return;
      const scale = Math.min(1, 2048 / Math.max(bmp.width, bmp.height));
      canvas.current.width = Math.round(bmp.width * scale);
      canvas.current.height = Math.round(bmp.height * scale);
      canvas.current
        .getContext("2d")!
        .drawImage(bmp, 0, 0, canvas.current.width, canvas.current.height);
      bmp.close();
      setFaceBlurred(false);
    });
    return () => {
      cancelled = true;
    };
  }, [file, isVideo]);

  function blurRect(x: number, y: number, w: number, h: number) {
    const c = canvas.current!;
    const ctx = c.getContext("2d")!;
    const pad = Math.max(w, h) * 0.25;
    const rx = Math.max(0, x - pad),
      ry = Math.max(0, y - pad);
    const rw = Math.min(c.width - rx, w + pad * 2),
      rh = Math.min(c.height - ry, h + pad * 2);
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(rx + rw / 2, ry + rh / 2, rw / 2, rh / 2, 0, 0, Math.PI * 2);
    ctx.clip();
    ctx.filter = `blur(${Math.round(Math.max(rw, rh) / 8)}px)`;
    ctx.drawImage(c, 0, 0);
    ctx.restore();
  }

  async function autoFaceBlur() {
    const FD = (window as unknown as { FaceDetector?: new (o: object) => FaceDetectorLike })
      .FaceDetector;
    if (!FD || !canvas.current) {
      setBrush(true);
      toast.err(
        "Auto face blur isn't available on this browser. Paint over anything you want hidden.",
      );
      return;
    }
    const faces = await new FD({ fastMode: false, maxDetectedFaces: 5 }).detect(canvas.current);
    if (!faces.length) {
      setBrush(true);
      return toast("No face found. Paint over anything you want hidden.");
    }
    faces.forEach((f) =>
      blurRect(f.boundingBox.x, f.boundingBox.y, f.boundingBox.width, f.boundingBox.height),
    );
    setFaceBlurred(true);
  }

  function paint(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!brush || !painting.current || !canvas.current) return;
    const r = canvas.current.getBoundingClientRect();
    const k = canvas.current.width / r.width;
    const size = 60 * k;
    blurRect((e.clientX - r.left) * k - size / 2, (e.clientY - r.top) * k - size / 2, size, size);
  }

  async function send() {
    if (!file) return;
    setBusy(true);
    try {
      let blob: Blob;
      let meta: { kind: "image" | "video"; durationS?: number; width?: number; height?: number };
      if (isVideo) {
        const v = await prepareVideo(file, (p) => setProgress(p * 0.5));
        blob = v.blob;
        meta = { kind: "video", durationS: v.durationS, width: v.width, height: v.height };
      } else {
        blob = await new Promise<Blob>((res, rej) =>
          canvas.current!.toBlob(
            (b) => (b ? res(b) : rej(new Error("Couldn't prepare that."))),
            "image/webp",
            0.85,
          ),
        );
        meta = { kind: "image", width: canvas.current!.width, height: canvas.current!.height };
      }
      const ret = retention === "exp" ? expiry : retention;
      const up = await uploadMedia(blob, { ...meta, sensitive: true, retention: ret }, (p) =>
        setProgress(0.5 + p * 0.5),
      );
      await darkFetch("/api/dark/send", { mediaId: up.id, spinId, requestId });
      toast(
        up.retention === "once"
          ? `Sent. View once. ${partner.name} sees a blurred card until they tap.`
          : up.retention === "vault"
            ? "Sent and kept in your vault."
            : `Sent. It disappears after ${ret === "24h" ? "24 h" : "7 days"}.`,
      );
      void qc.invalidateQueries({ queryKey: ["vault"] });
      setFile(null);
      onSent?.();
      onClose();
    } catch (e) {
      toast.err(e instanceof Error ? e.message : "That didn't send.");
    } finally {
      setBusy(false);
      setProgress(0);
    }
  }

  if (!open) return null;
  const retNote =
    retention === "once"
      ? "Opens once, full screen. Gone within 60 s of closing."
      : retention === "exp"
        ? `Viewable until it expires in ${expiry === "24h" ? "24 h" : "7 days"}. Then deleted.`
        : "Stays in both vaults until you unsend it.";
  return (
    <>
      <div
        aria-hidden
        className="an-fade fixed inset-0 z-[60]"
        style={{ background: "var(--scrim-strong)" }}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="send-title"
        className="an-sheet border-line bg-s1 fixed inset-x-0 bottom-0 z-[61] mx-auto flex max-h-[94dvh] max-w-[560px] flex-col gap-3.5 overflow-y-auto rounded-t-[20px] border-t px-5 pt-5 pb-[calc(32px+env(safe-area-inset-bottom))] md:bottom-6 md:rounded-[20px] md:border"
        style={{ boxShadow: "var(--shadow-sheet)" }}
      >
        <div className="flex items-center justify-between">
          <div id="send-title" className="display text-[22px] tracking-normal">
            Send to {partner.name}
          </div>
          <IconButton label="Close" dim={40} onClick={onClose}>
            <X size={18} />
          </IconButton>
        </div>
        <div className="rounded-thumb bg-s2 relative h-[190px] overflow-hidden md:h-[260px]">
          {!file ? (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="text-muted flex h-full w-full cursor-pointer flex-col items-center justify-center gap-2 bg-transparent"
            >
              <ImageSquare size={36} aria-hidden />
              <span className="text-sm font-medium">Take or pick a photo or video</span>
            </button>
          ) : isVideo ? (
            <video
              src={URL.createObjectURL(file)}
              className="h-full w-full object-contain"
              style={{ filter: "blur(4px)" }}
              muted
              playsInline
            />
          ) : (
            <canvas
              ref={canvas}
              className="h-full w-full touch-none object-contain"
              style={{ cursor: brush ? "crosshair" : "default" }}
              onPointerDown={(e) => {
                painting.current = true;
                paint(e);
              }}
              onPointerMove={paint}
              onPointerUp={() => (painting.current = false)}
              aria-label="Your photo preview"
            />
          )}
          {file && (
            <div className="mono bg-app/70 text-muted absolute bottom-2.5 left-2.5 rounded px-1.5 text-[11px]">
              YOUR {isVideo ? "VIDEO" : "PHOTO"} · EXIF REMOVED
            </div>
          )}
          {file && !isVideo && (
            <div className="absolute top-2.5 right-2.5 flex gap-1.5">
              <button
                type="button"
                onClick={autoFaceBlur}
                className="border-line bg-app text-text flex h-9 cursor-pointer items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium"
              >
                <UserFocus size={16} aria-hidden /> {faceBlurred ? "Face blur on" : "Face blur"}
              </button>
              <button
                type="button"
                aria-pressed={brush}
                onClick={() => setBrush(!brush)}
                className="bg-app text-text flex h-9 cursor-pointer items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium"
                style={{ borderColor: brush ? "var(--accent-dark)" : "var(--line)" }}
              >
                <PaintBrush size={16} aria-hidden /> Brush
              </button>
            </div>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*,video/*"
            hidden
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>
        <div
          className="border-line bg-app flex rounded-full border p-1"
          role="radiogroup"
          aria-label="How long it lasts"
        >
          {(
            [
              ["once", "View once"],
              ["exp", "Expires"],
              ["vault", "Keep in vault"],
            ] as const
          ).map(([k, label]) => {
            const disabled = k === "vault" && !s?.allowSaved;
            return (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={retention === k}
                disabled={disabled}
                onClick={() => setRetention(k)}
                className="press h-10 flex-1 cursor-pointer rounded-full border-0 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40"
                style={{
                  background: retention === k ? "var(--accent-dark)" : "transparent",
                  color: retention === k ? "var(--on-accent)" : "var(--text)",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
        {retention === "exp" && (
          <div className="flex gap-2" role="radiogroup" aria-label="Expiry">
            {(
              [
                ["24h", "24 h"],
                ["7d", "7 days"],
              ] as const
            ).map(([k, l]) => (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={expiry === k}
                onClick={() => setExpiry(k)}
                className="mono h-9 cursor-pointer rounded-full border bg-transparent px-3.5 text-[13px]"
                style={{
                  borderColor: expiry === k ? "var(--accent-dark)" : "var(--line)",
                  color: expiry === k ? "var(--text)" : "var(--text-muted)",
                }}
              >
                {l}
              </button>
            ))}
          </div>
        )}
        <div className="text-muted text-sm leading-[1.4]">
          {retNote}
          {!s?.allowSaved &&
            " Keep in vault needs you both to allow saved spicy media in Settings."}
        </div>
        {busy && progress > 0 && (
          <div
            className="bg-line h-1 overflow-hidden rounded-full"
            role="progressbar"
            aria-valuenow={Math.round(progress * 100)}
          >
            <div className="bg-ember h-full" style={{ width: `${progress * 100}%` }} />
          </div>
        )}
        <Button disabled={!file || busy} onClick={send}>
          {busy ? "Sending" : "Send"}
        </Button>
      </div>
      {notice && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center p-6"
          style={{ background: "rgba(15,14,17,.7)" }}
        >
          <div
            role="alertdialog"
            aria-labelledby="notice-t"
            className="an-reveal rounded-card border-line bg-s2 flex max-w-[400px] flex-col gap-3.5 border p-6"
            style={{ boxShadow: "var(--shadow-float)" }}
          >
            <DeviceMobileCamera size={32} className="text-ember" aria-hidden />
            <div id="notice-t" className="display text-[28px] leading-[1.05]">
              They can still screenshot.
            </div>
            <p className="text-muted m-0 text-base leading-normal">
              Only send what feels right. We blur, watermark and delete on schedule, but no app can
              stop a screenshot.
            </p>
            <Button
              size="lg"
              autoFocus
              onClick={async () => {
                await darkFetch("/api/dark/notice", {});
                setNoticeDone(true);
                void qc.invalidateQueries({ queryKey: ["dark-state"] });
              }}
            >
              Got it
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
