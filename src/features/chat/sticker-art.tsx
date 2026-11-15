import { cn } from "@/components/ui/cn";

/** Which stickers carry their words as a meme caption. */
export const STICKER_CAPTION = new Map<string, boolean>();

/**
 * A picture sticker: 3D art with an optional meme-style caption (heavy white
 * type with a dark outline), so it reads on any background.
 */
export function StickerArt({
  id,
  label,
  size = 120,
  className,
}: {
  id: string;
  label: string;
  size?: number;
  className?: string;
}) {
  const caption = STICKER_CAPTION.get(id) ?? true;
  return (
    <span
      className={cn("relative inline-flex flex-none items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/stickers/${id}.webp`}
        alt=""
        draggable={false}
        className="h-[86%] w-[86%] object-contain drop-shadow-[0_6px_10px_rgba(0,0,0,.45)] select-none"
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.visibility = "hidden";
        }}
      />
      {caption && (
        <span
          className="absolute inset-x-0 bottom-[2%] text-center leading-none font-black tracking-tight text-white uppercase"
          style={{
            fontSize: Math.max(11, Math.round(size * 0.17)),
            WebkitTextStroke: `${Math.max(2, size / 40)}px #111`,
            paintOrder: "stroke fill",
            textShadow: "0 2px 0 rgba(0,0,0,.35)",
          }}
        >
          {label}
        </span>
      )}
    </span>
  );
}
