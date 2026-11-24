"use client";
import { useId, useState } from "react";
import { cn } from "@/components/ui/cn";
import { MARK, BRAND } from "./mark-paths";

/**
 * The animated Clink mark. On mount the flutes swing in from apart, touch,
 * and a champagne spark pops. Hover or tap clinks again. Still for reduced
 * motion. Pure CSS (globals.css, "Logo"), so pages that only show the logo
 * never load an animation library.
 */
export function LogoMark({
  size = 40,
  animate = true,
  className,
  title = "Clink",
  decorative = false,
}: {
  size?: number;
  animate?: boolean;
  className?: string;
  title?: string;
  /** Hide from screen readers when a wordmark next to it already says "Clink". */
  decorative?: boolean;
}) {
  const id = useId().replace(/:/g, "");
  const [n, setN] = useState(0);
  const again = () => animate && setN((v) => v + 1);
  // Flutes pivot where the rims touch (32,15) and rest tilted 9deg, like the app icon.
  return (
    <svg
      viewBox={MARK.viewBox}
      width={(size * 64) / 80}
      height={size}
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : title}
      aria-hidden={decorative || undefined}
      className={cn("overflow-visible", animate && "logo-live", className)}
      onPointerEnter={(e) => e.pointerType === "mouse" && again()}
      onPointerUp={again}
    >
      <defs>
        <linearGradient id={`l${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={BRAND.blush} />
          <stop offset="0.45" stopColor={BRAND.rouge} />
          <stop offset="1" stopColor="#D9305E" />
        </linearGradient>
        <linearGradient id={`r${id}`} x1="1" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={BRAND.champagne} />
          <stop offset="0.5" stopColor="#FF7A5C" />
          <stop offset="1" stopColor={BRAND.ember} />
        </linearGradient>
      </defs>
      <g key={`L${n}`} className="logo-flute" style={{ ["--dir" as string]: 1 }}>
        <path d={MARK.left} fill={`url(#l${id})`} />
        <path
          d={MARK.leftFizz}
          fill="none"
          stroke="#fff"
          strokeOpacity=".55"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      </g>
      <g key={`R${n}`} className="logo-flute" style={{ ["--dir" as string]: -1 }}>
        <path d={MARK.right} fill={`url(#r${id})`} />
        <path
          d={MARK.rightFizz}
          fill="none"
          stroke="#fff"
          strokeOpacity=".55"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      </g>
      <path
        key={`S${n}`}
        d={MARK.spark}
        fill={BRAND.champagne}
        className="logo-spark"
        style={n > 0 ? { animationDelay: "350ms" } : undefined}
      />
    </svg>
  );
}

/**
 * The wordmark: "clink" in Cabinet Grotesk, the i's dot replaced by a tiny
 * Rouge heart that pulses now and then.
 */
export function Wordmark({ size = 30, className }: { size?: number; className?: string }) {
  return (
    <span
      className={cn(
        "display relative inline-flex items-baseline leading-none font-extrabold tracking-[-0.03em]",
        className,
      )}
      style={{ fontSize: size }}
      aria-label="Clink"
      role="img"
    >
      <span aria-hidden>cl</span>
      <span aria-hidden className="relative">
        ı{/* The beat moves an HTML wrapper, which the compositor can run on its own. */}
        <span
          aria-hidden
          className="wordmark-heart absolute left-1/2 block -translate-x-1/2"
          style={{ width: size * 0.3, top: -size * 0.12 }}
        >
          <svg viewBox="0 0 24 22" className="block w-full">
            <path
              d="M12 21C5 15.5 1 11.6 1 7.2C1 3.9 3.6 1.3 6.8 1.3C8.9 1.3 10.8 2.4 12 4.1C13.2 2.4 15.1 1.3 17.2 1.3C20.4 1.3 23 3.9 23 7.2C23 11.6 19 15.5 12 21Z"
              fill={BRAND.rouge}
            />
          </svg>
        </span>
      </span>
      <span aria-hidden>nk</span>
    </span>
  );
}

/** Mark and wordmark together. */
export function Logo({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark size={size * 1.25} decorative />
      <Wordmark size={size} />
    </span>
  );
}
