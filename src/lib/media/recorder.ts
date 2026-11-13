"use client";

export const VOICE_MAX_S = 180;

function pickAudioMime(): string {
  const options = ["audio/webm;codecs=opus", "audio/mp4", "audio/ogg;codecs=opus", "audio/webm"];
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

/** Hold-to-record voice notes, capped at 3 minutes (CHAT-02). */
export class VoiceRecorder {
  private rec: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private started = 0;
  private stream: MediaStream | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  onAutoStop?: () => void;

  async start() {
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true },
    });
    const mime = pickAudioMime();
    this.rec = new MediaRecorder(
      this.stream,
      mime ? { mimeType: mime, audioBitsPerSecond: 48_000 } : undefined,
    );
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
    this.stream?.getTracks().forEach((t) => t.stop());
    const durationS = Math.min(VOICE_MAX_S, (performance.now() - this.started) / 1000);
    this.rec = null;
    const blob = new Blob(this.chunks, { type: (rec.mimeType || "audio/webm").split(";")[0] });
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
    this.stream?.getTracks().forEach((t) => t.stop());
    this.rec = null;
  }
}
