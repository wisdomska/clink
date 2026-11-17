"use client";

/** Decode any image the browser can read: the fast path first, then an <img> (HEIC on Apple devices, big photos). */
async function decode(
  file: Blob,
): Promise<{ src: CanvasImageSource; w: number; h: number; done: () => void }> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    return { src: bitmap, w: bitmap.width, h: bitmap.height, done: () => bitmap.close() };
  } catch {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    try {
      await img.decode();
    } catch {
      URL.revokeObjectURL(url);
      throw new Error("That photo can't be read on this device. Try a JPEG or PNG.");
    }
    return {
      src: img,
      w: img.naturalWidth,
      h: img.naturalHeight,
      done: () => URL.revokeObjectURL(url),
    };
  }
}

/** WebP where the browser can encode it, JPEG otherwise (older Safari hands back a huge PNG). */
async function encode(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  const webp = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/webp", quality));
  if (webp && webp.type === "image/webp") return webp;
  const jpeg = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", quality));
  if (!jpeg) throw new Error("Couldn't prepare that photo.");
  return jpeg;
}

/**
 * Client-side image compression. Re-encoding through a canvas drops every
 * EXIF block, including GPS (SAF-03, client half). Max 2048 px; WebP, or JPEG
 * where WebP can't be encoded. Reads HEIC and very large photos too.
 */
export async function compressImage(
  file: Blob,
  maxSide = 2048,
  quality = 0.85,
): Promise<{ blob: Blob; width: number; height: number }> {
  const d = await decode(file);
  try {
    const scale = Math.min(1, maxSide / Math.max(d.w, d.h));
    const width = Math.max(1, Math.round(d.w * scale));
    const height = Math.max(1, Math.round(d.h * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("This browser can't process images.");
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(d.src, 0, 0, width, height);
    const blob = await encode(canvas, quality);
    canvas.width = canvas.height = 0; // free the pixels now (iOS keeps a tight canvas budget)
    return { blob, width, height };
  } finally {
    d.done();
  }
}

/** Square crop for avatars. */
export async function squareAvatar(file: Blob, side = 512): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const s = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = side;
  canvas.height = side;
  canvas
    .getContext("2d")!
    .drawImage(bitmap, (bitmap.width - s) / 2, (bitmap.height - s) / 2, s, s, 0, 0, side, side);
  bitmap.close();
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/webp", 0.85));
  if (!blob) throw new Error("Couldn't process that photo.");
  return blob;
}
