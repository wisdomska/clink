"use client";

export const VOICE_MAX_S = 180;

// AAC in MP4 first: it plays on every phone (WebM/Opus often won't play on iPhone).
function pickAudioMime(): string {
  const options = [
    "audio/mp4;codecs=mp4a.40.2",
    "audio/mp4",
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
  ];
  return (
    options.find((m) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m)) ??
    ""
  );
}

/** Downsample an audio blob into N peak bars (0-100) for the waveform. */
export async function peaks(blob: Blob, bars = 28): Promise<number[]> {
  try {
    const ac = new AudioContext();
    const buf = await ac.decodeAudioData(await blob.arrayBuffer());
    void ac.close();
    const data = buf.getChannelData(0);
    const step = Math.floor(data.length / bars) || 1;
    const out: number[] = [];
    for (let i = 0; i < bars; i++) {
      let max = 0;
      for (let j = i * step; j < Math.min(data.length, (i + 1) * step); j += 16)
        max = Math.max(max, Math.abs(data[j]!));
      out.push(max);
    }
    const top = Math.max(...out, 0.01);
    return out.map((v) => Math.max(8, Math.round((v / top) * 100)));
  } catch {
    return Array.from({ length: bars }, (_, i) => 20 + ((i * 37) % 60));
  }
}

export interface Recording {
  blob: Blob;
  durationS: number;
  waveform: number[];
}

export type RecorderProblem = "unsupported" | "blocked" | "no_mic" | "busy";
export class RecorderError extends Error {
  constructor(public problem: RecorderProblem) {
    super(problem);
  }
}

export const RECORDER_MESSAGES: Record<RecorderProblem, string> = {
  unsupported: "This browser can't record audio. Update it, or try Chrome or Safari.",
  blocked: "The microphone is blocked for Clink. Allow it in your browser's site settings.",
  no_mic: "No microphone found on this device.",
  busy: "The microphone is busy in another app. Close it and try again.",
};

/** Hold-to-record voice notes, capped at 3 minutes (CHAT-02). */
export class VoiceRecorder {
  private rec: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private started = 0;
  private stream: MediaStream | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private buf: Uint8Array<ArrayBuffer> | null = null;
  onAutoStop?: () => void;

  /** Live input level, 0..1, for the recording waveform. */
  level(): number {
    if (!this.analyser || !this.buf) return 0;
    this.analyser.getByteTimeDomainData(this.buf);
    let sum = 0;
    for (const v of this.buf) sum += ((v - 128) / 128) ** 2;
    return Math.min(1, Math.sqrt(sum / this.buf.length) * 3.2);
  }

  private meter(stream: MediaStream) {
    try {
      const AC =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AC();
      const src = this.ctx.createMediaStreamSource(stream);
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 512;
      this.buf = new Uint8Array(new ArrayBuffer(this.analyser.fftSize));
      src.connect(this.analyser);
    } catch {
      /* no meter: the waveform just idles */
    }
  }

  private unmeter() {
    void this.ctx?.close().catch(() => undefined);
    this.ctx = null;
    this.analyser = null;
  }

  async start() {
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia)
      throw new RecorderError("unsupported");
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
    } catch (e) {
      const name = (e as DOMException)?.name;
      throw new RecorderError(
        name === "NotAllowedError" || name === "SecurityError"
          ? "blocked"
          : name === "NotFoundError" || name === "OverconstrainedError"
            ? "no_mic"
            : "busy",
      );
    }
    const mime = pickAudioMime();
    try {
      this.rec = new MediaRecorder(
        this.stream,
        mime ? { mimeType: mime, audioBitsPerSecond: 48_000 } : undefined,
      );
    } catch {
      this.rec = new MediaRecorder(this.stream); // let the browser pick its own format
    }
    this.meter(this.stream);
    this.chunks = [];
    this.rec.ondataavailable = (e) => e.data.size && this.chunks.push(e.data);
    this.rec.start(250);
    this.started = performance.now();
    this.timer = setTimeout(() => this.onAutoStop?.(), VOICE_MAX_S * 1000);
  }

  elapsed(): number {
    return this.rec ? (performance.now() - this.started) / 1000 : 0;
  }

  async stop(): Promise<Recording | null> {
    if (!this.rec) return null;
    if (this.timer) clearTimeout(this.timer);
    const rec = this.rec;
    const done = new Promise<void>((res) => (rec.onstop = () => res()));
    rec.stop();
    await done;
    this.unmeter();
    this.stream?.getTracks().forEach((t) => t.stop());
    const durationS = Math.min(VOICE_MAX_S, (performance.now() - this.started) / 1000);
    this.rec = null;
    const type = (rec.mimeType || this.chunks[0]?.type || "audio/webm").split(";")[0]!;
    const blob = new Blob(this.chunks, { type });
    if (durationS < 0.6 || blob.size === 0) return null;
    return { blob, durationS: Math.round(durationS * 10) / 10, waveform: await peaks(blob) };
  }

  cancel() {
    if (this.timer) clearTimeout(this.timer);
    try {
      this.rec?.stop();
    } catch {
      /* already stopped */
    }
    this.unmeter();
    this.stream?.getTracks().forEach((t) => t.stop());
    this.rec = null;
  }
}
