"use client";
import { MAX_DURATION } from "@/lib/media-rules";

export interface PreparedVideo {
  blob: Blob;
  durationS: number;
  width: number;
  height: number;
}

const LONG_SIDE = 1280; // 720p
const tooLong = () =>
  new Error(`Videos can be up to ${Math.round(MAX_DURATION.video / 60)} minutes.`);

/**
 * Get a video ready to send: at most 720p H.264 MP4, metadata (GPS included)
 * stripped (SAF-03). First choice is WebCodecs through Mediabunny, which runs
 * faster than real time and keeps going in the background. Older browsers
 * fall back to re-recording through a canvas.
 */
export async function prepareVideo(
  file: File,
  onProgress?: (p: number) => void,
): Promise<PreparedVideo> {
  try {
    const fast = await convertFast(file, onProgress);
    if (fast) return fast;
  } catch (e) {
    if (e instanceof Error && e.message.startsWith("Videos can be up to")) throw e;
    // Anything else: try the slower path below.
  }
  return reRecord(file, onProgress);
}

/** WebCodecs conversion. Returns null when this browser can't do it. */
async function convertFast(
  file: File,
  onProgress?: (p: number) => void,
): Promise<PreparedVideo | null> {
  if (typeof VideoEncoder === "undefined" || typeof VideoDecoder === "undefined") return null;
  const mb = await import("mediabunny");
  const input = new mb.Input({ source: new mb.BlobSource(file), formats: mb.ALL_FORMATS });
  const durationS = await input.computeDuration();
  if (!Number.isFinite(durationS) || durationS <= 0) return null;
  if (durationS > MAX_DURATION.video + 0.5) throw tooLong();
  const track = await input.getPrimaryVideoTrack();
  if (!track) return null;
  const w0 = track.displayWidth;
  const h0 = track.displayHeight;
  const scale = Math.min(1, LONG_SIDE / Math.max(w0, h0));
  const width = Math.max(2, Math.round((w0 * scale) / 2) * 2);
  const height = Math.max(2, Math.round((h0 * scale) / 2) * 2);
  if (!(await mb.canEncodeVideo("avc", { width, height }))) return null;

  const target = new mb.BufferTarget();
  const output = new mb.Output({
    format: new mb.Mp4OutputFormat({ fastStart: "in-memory" }),
    target,
  });
  const conversion = await mb.Conversion.init({
    input,
    output,
    video: { width, height, fit: "contain", codec: "avc", bitrate: mb.QUALITY_MEDIUM },
    // Re-encode to AAC where the browser can; otherwise the original audio is copied.
    audio: async (t) =>
      (await mb.canEncodeAudio("aac"))
        ? { codec: "aac", bitrate: 96_000 }
        : { codec: t.codec ?? undefined },
    // No descriptive metadata in the output (location, device, dates).
    tags: () => ({}),
  });
  if (!conversion.isValid) return null;
  conversion.onProgress = (p) => onProgress?.(p);
  await conversion.execute();
  const buf = target.buffer;
  if (!buf) return null;
  return { blob: new Blob([buf], { type: "video/mp4" }), durationS, width, height };
}

function pickMime(): string {
  const options = [
    "video/mp4;codecs=avc1,mp4a",
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
    "video/mp4",
  ];
  return (
    options.find((m) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m)) ??
    "video/webm"
  );
}

/**
 * Fallback: re-encode through a canvas and MediaRecorder at up to 720p. Runs
 * in real time. Playback starts muted (always allowed); the sound is carried
 * through WebAudio, so nothing plays out loud.
 */
async function reRecord(file: File, onProgress?: (p: number) => void): Promise<PreparedVideo> {
  const url = URL.createObjectURL(file);
  try {
    const video = document.createElement("video");
    video.src = url;
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    await new Promise<void>((res, rej) => {
      video.onloadedmetadata = () => res();
      video.onerror = () => rej(new Error("That video can't be read on this device."));
    });
    const durationS = video.duration;
    if (!Number.isFinite(durationS)) throw new Error("That video can't be read on this device.");
    if (durationS > MAX_DURATION.video + 0.5) throw tooLong();
    const scale = Math.min(1, LONG_SIDE / Math.max(video.videoWidth, video.videoHeight));
    const width = Math.round((video.videoWidth * scale) / 2) * 2;
    const height = Math.round((video.videoHeight * scale) / 2) * 2;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d")!;
    const stream = canvas.captureStream(30);
    let ac: AudioContext | null = null;
    try {
      ac = new AudioContext();
      const srcNode = ac.createMediaElementSource(video);
      const dest = ac.createMediaStreamDestination();
      srcNode.connect(dest);
      dest.stream.getAudioTracks().forEach((t) => stream.addTrack(t));
      video.muted = false; // routed to the recorder only, not the speakers
    } catch {
      /* no audio on this path: send it silent rather than not at all */
    }
    const mime = pickMime();
    const rec = new MediaRecorder(stream, {
      mimeType: mime,
      videoBitsPerSecond: 2_000_000,
      audioBitsPerSecond: 96_000,
    });
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    const finished = new Promise<void>((res) => (rec.onstop = () => res()));
    // requestVideoFrameCallback keeps drawing even when rAF is throttled.
    const rvfc = (
      video as HTMLVideoElement & {
        requestVideoFrameCallback?: (cb: () => void) => number;
      }
    ).requestVideoFrameCallback?.bind(video);
    let raf = 0;
    const draw = () => {
      ctx.drawImage(video, 0, 0, width, height);
      onProgress?.(Math.min(1, video.currentTime / durationS));
      raf = rvfc ? rvfc(draw) : requestAnimationFrame(draw);
    };
    rec.start(500);
    try {
      await video.play();
    } catch {
      video.muted = true;
      await video.play();
    }
    draw();
    await new Promise<void>((res) => (video.onended = () => res()));
    if (!rvfc) cancelAnimationFrame(raf);
    rec.stop();
    await finished;
    await ac?.close();
    return { blob: new Blob(chunks, { type: mime.split(";")[0] }), durationS, width, height };
  } finally {
    URL.revokeObjectURL(url);
  }
}
