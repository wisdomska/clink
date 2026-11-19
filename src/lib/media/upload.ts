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

/** A ~16px copy of a photo as a data URL, shown blurred while the real one loads. */
async function tinyPreview(blob: Blob): Promise<string | undefined> {
  try {
    const bmp = await createImageBitmap(blob);
    const w = 16;
    const h = Math.max(1, Math.round((bmp.height / bmp.width) * w));
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    c.getContext("2d")?.drawImage(bmp, 0, 0, w, h);
    bmp.close();
    let url = c.toDataURL("image/webp", 0.5);
    if (!url.startsWith("data:image/webp")) url = c.toDataURL("image/jpeg", 0.5);
    return url.length <= 2000 ? url : undefined;
  } catch {
    return undefined;
  }
}

/** Signed upload, straight to storage, then server-side completion (metadata strip). */
export async function uploadMedia(
  blob: Blob,
  meta: UploadMeta,
  onProgress?: (p: number) => void,
): Promise<{ id: string; retention: string }> {
  const placeholder =
    meta.kind === "image" && !meta.sensitive ? await tinyPreview(blob) : undefined;
  const res = await fetch("/api/media/upload-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...meta,
      placeholder,
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
