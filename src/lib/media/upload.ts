"use client";
import type { MediaKind } from "@/lib/media-rules";

export interface UploadMeta {
  kind: MediaKind;
  sensitive?: boolean;
  retention?: "once" | "24h" | "7d" | "vault";
  durationS?: number;
  width?: number;
  height?: number;
  waveform?: number[];
}

/** Signed upload, straight to storage, then server-side completion (metadata strip). */
export async function uploadMedia(
  blob: Blob,
  meta: UploadMeta,
  onProgress?: (p: number) => void,
): Promise<{ id: string; retention: string }> {
  const res = await fetch("/api/media/upload-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...meta,
      mime: blob.type || "application/octet-stream",
      size: blob.size,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? "Upload failed.");
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(data.upload.method, data.upload.url);
    for (const [k, v] of Object.entries(data.upload.headers as Record<string, string>))
      xhr.setRequestHeader(k, v);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total);
    xhr.onload = () => (xhr.status < 300 ? resolve() : reject(new Error("Upload failed.")));
    xhr.onerror = () => reject(new Error("Upload failed. Check your connection."));
    xhr.send(blob);
  });
  const done = await fetch(`/api/media/${data.id}/complete`, { method: "POST" });
  if (!done.ok) throw new Error((await done.json()).message ?? "Upload failed.");
  return { id: data.id, retention: data.retention };
}
