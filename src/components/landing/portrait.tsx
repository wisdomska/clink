import Image from "next/image";

/** Ama and Theo, as they appear everywhere on the landing page. */
export const PEOPLE_STYLE = {
  // Each in the colour of their glass (flutes.tsx), so person and glass belong together.
  ama: { tint: "var(--accent)", flip: true },
  theo: { tint: "#FF7A5C", flip: false },
} as const;

/**
 * Morning in Accra, night in New York: the two halves' skies, kept dark.
 * (The hero works these out from the real local time instead.)
 */
export const SKY = {
  warm: "radial-gradient(120% 70% at 50% 0%, rgba(255,170,110,.20) 0%, rgba(255,120,120,.07) 45%, transparent 75%), linear-gradient(180deg, #24161c 0%, #160f14 100%)",
  night:
    "radial-gradient(120% 70% at 50% 0%, rgba(120,110,255,.14) 0%, transparent 70%), linear-gradient(180deg, #120f22 0%, #0d0a14 100%)",
} as const;

/**
 * A memoji in a soft disc of the person's colour, contact-poster style: the
 * bust cropped by the disc at the bottom, the head free to break out of the
 * top. Size it with `className` (it fills a square box).
 */
export function Portrait({
  who,
  src,
  className,
  sizes,
  priority = false,
}: {
  who: keyof typeof PEOPLE_STYLE;
  src: string;
  className: string;
  sizes: string;
  priority?: boolean;
}) {
  const { tint, flip } = PEOPLE_STYLE[who];
  return (
    <div className={`relative ${className}`} style={{ ["--tint" as string]: tint }}>
      {/* The frame: a soft disc and a fine ring in their colour. */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background:
            "radial-gradient(circle at 50% 35%, color-mix(in oklab, var(--tint) 38%, transparent) 0%, color-mix(in oklab, var(--tint) 14%, transparent) 55%, color-mix(in oklab, var(--tint) 6%, transparent) 100%)",
          boxShadow:
            "inset 0 0 0 1.5px color-mix(in oklab, var(--tint) 55%, transparent), 0 18px 40px -12px color-mix(in oklab, var(--tint) 45%, transparent)",
        }}
      />
      {/* The bust, cropped by the disc at the bottom, head free above it. */}
      <div
        className="absolute inset-x-[-4%] bottom-0 h-[140%]"
        style={{ clipPath: "inset(-20% 3.7% 0 3.7% round 0 0 999px 999px)" }}
      >
        <Image
          src={src}
          alt=""
          fill
          sizes={sizes}
          className="object-contain object-bottom drop-shadow-[0_8px_14px_rgba(0,0,0,.35)]"
          style={flip ? { transform: "scaleX(-1)" } : undefined}
          priority={priority}
        />
      </div>
    </div>
  );
}
