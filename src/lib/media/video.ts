"use client";

export interface PreparedVideo {
  blob: Blob;
  durationS: number;
  width: number;
  height: number;
}

function pickMime(): string {
  const options = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
    "video/mp4;codecs=avc1,mp4a",
    "video/mp4",
  ];
  return (
    options.find((m) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m)) ??
    "video/webm"
  );
}

/**
 * Re-encodes a video to at most 720p through a canvas and MediaRecorder.
 * This caps resolution and bitrate (free-tier storage) and drops container
 * metadata such as GPS location (SAF-03). Max 60 s.
 */
export async function prepareVideo(
  file: File,
  onProgress?: (p: number) => void,
): Promise<PreparedVideo> {
  const url = URL.createObjectURL(file);
  try {
    const video = document.createElement("video");
    video.src = url;
    video.muted = true;
    video.playsInline = true;
    await new Promise<void>((res, rej) => {
      video.onloadedmetadata = () => res();
      video.onerror = () => rej(new Error("That video can't be read."));
    });
    const durationS = video.duration;
    if (!Number.isFinite(durationS) || durationS > 60.5)
      throw new Error("Videos can be up to 60 seconds.");
    const scale = Math.min(1, 720 / Math.min(video.videoWidth, video.videoHeight));
    const width = Math.round((video.videoWidth * scale) / 2) * 2;
    const height = Math.round((video.videoHeight * scale) / 2) * 2;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d")!;
    const stream = canvas.captureStream(30);
    // Carry the audio track through a muted-to-speakers WebAudio graph.
    const ac = new AudioContext();
    const srcNode = ac.createMediaElementSource(video);
    const dest = ac.createMediaStreamDestination();
    srcNode.connect(dest);
    dest.stream.getAudioTracks().forEach((t) => stream.addTrack(t));
    video.muted = false;
    const mime = pickMime();
    const rec = new MediaRecorder(stream, {
      mimeType: mime,
      videoBitsPerSecond: 2_000_000,
      audioBitsPerSecond: 96_000,
    });
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    const finished = new Promise<void>((res) => (rec.onstop = () => res()));
    let raf = 0;
    const draw = () => {
      ctx.drawImage(video, 0, 0, width, height);
      onProgress?.(Math.min(1, video.currentTime / durationS));
      raf = requestAnimationFrame(draw);
    };
    rec.start(500);
    await video.play();
    draw();
    await new Promise<void>((res) => (video.onended = () => res()));
    cancelAnimationFrame(raf);
    rec.stop();
    await finished;
    await ac.close();
    return { blob: new Blob(chunks, { type: mime.split(";")[0] }), durationS, width, height };
  } finally {
    URL.revokeObjectURL(url);
  }
}
