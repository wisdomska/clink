/** Media rules shared by client and server. */
export const MIME = {
  image: ["image/webp", "image/jpeg", "image/png"],
  video: ["video/webm", "video/mp4", "video/quicktime"],
  audio: ["audio/webm", "audio/ogg", "audio/mp4", "audio/mpeg", "audio/aac"],
} as const;
export type MediaKind = keyof typeof MIME;

export const MAX_DURATION = { video: 180, audio: 180 } as const;
export const MAX_PER_SEND = 10;
export type Retention = "keep" | "once" | "24h" | "7d" | "vault";

export function extFor(mime: string): string {
  const m: Record<string, string> = {
    "image/webp": "webp",
    "image/jpeg": "jpg",
    "image/png": "png",
    "video/webm": "webm",
    "video/mp4": "mp4",
    "video/quicktime": "mov",
    "audio/webm": "webm",
    "audio/ogg": "ogg",
    "audio/mp4": "m4a",
    "audio/mpeg": "mp3",
    "audio/aac": "aac",
  };
  return m[mime.split(";")[0]!] ?? "bin";
}

export function expiryFor(retention: Retention, from = new Date()): string | null {
  if (retention === "24h") return new Date(from.getTime() + 24 * 3600 * 1000).toISOString();
  if (retention === "7d") return new Date(from.getTime() + 7 * 24 * 3600 * 1000).toISOString();
  return null;
}
