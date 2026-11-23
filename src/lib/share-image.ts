"use client";
/**
 * Turns an on-screen card into a PNG, then hands it to the device's share
 * sheet, or saves it where sharing files isn't supported. Fonts are loaded
 * first so the image matches the screen.
 */
export async function captureCard(el: HTMLElement, scale = 3): Promise<Blob> {
  await document.fonts.ready;
  const { domToBlob } = await import("modern-screenshot");
  const blob = await domToBlob(el, { scale, type: "image/png" });
  if (!blob) throw new Error("Couldn't make the image.");
  return blob;
}

export const canShareFiles = () => {
  try {
    const f = new File([new Blob()], "x.png", { type: "image/png" });
    return typeof navigator !== "undefined" && !!navigator.canShare?.({ files: [f] });
  } catch {
    return false;
  }
};

/** "shared", "saved", or "cancelled" (the person closed the share sheet). */
export async function shareOrSave(blob: Blob, filename: string, title: string) {
  const file = new File([blob], filename, { type: "image/png" });
  if (canShareFiles()) {
    try {
      await navigator.share({ files: [file], title });
      return "shared" as const;
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return "cancelled" as const;
      // Anything else: fall back to saving it.
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return "saved" as const;
}
