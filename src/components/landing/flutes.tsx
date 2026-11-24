import { useId } from "react";
import { MARK, BRAND } from "@/components/brand/mark-paths";
import { cn } from "@/components/ui/cn";

/**
 * The Clink mark's two flutes as separate pieces, so they can travel in from
 * each side of a split scene and meet in the middle. Paths come from the
 * brand source of truth; never redraw them.
 *
 * Each piece is its own full-size layer, and the CSS animations (landing.css,
 * "flutes") move the HTML wrappers rather than SVG groups, so the browser
 * runs them on the compositor with no main-thread work per frame. The
 * resting pose is the base style. Give it a 4:5 box (the mark's 64 by 80).
 *
 * - mode "loop": clinks forever on the hero's 6.5 s clock (touch at 28%).
 * - mode "once": swings in once; change `playKey` to clink again (demo).
 * - still: the resting 9 degree pose with the spark lit (reduced motion).
 */
export function Flutes({
  mode,
  playKey = 0,
  still = false,
  className,
}: {
  mode: "loop" | "once";
  playKey?: number;
  still?: boolean;
  className?: string;
}) {
  const id = useId().replace(/:/g, "");
  const layer = "absolute inset-0 block";

  return (
    <span
      key={playKey}
      aria-hidden
      className={cn("relative block", !still && `lp-flutes-${mode}`, className)}
    >
      <span className={cn(layer, "lp-flute")} style={{ ["--dir" as string]: 1 }}>
        <svg viewBox={MARK.viewBox} className="h-full w-full overflow-visible">
          <defs>
            <linearGradient id={`fl${id}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor={BRAND.blush} />
              <stop offset="0.45" stopColor={BRAND.rouge} />
              <stop offset="1" stopColor="#D9305E" />
            </linearGradient>
          </defs>
          <path d={MARK.left} fill={`url(#fl${id})`} />
          <path
            d={MARK.leftFizz}
            fill="none"
            stroke="#fff"
            strokeOpacity=".55"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </svg>
      </span>
      <span className={cn(layer, "lp-flute")} style={{ ["--dir" as string]: -1 }}>
        <svg viewBox={MARK.viewBox} className="h-full w-full overflow-visible">
          <defs>
            <linearGradient id={`fr${id}`} x1="1" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={BRAND.champagne} />
              <stop offset="0.5" stopColor="#FF7A5C" />
              <stop offset="1" stopColor={BRAND.ember} />
            </linearGradient>
          </defs>
          <path d={MARK.right} fill={`url(#fr${id})`} />
          <path
            d={MARK.rightFizz}
            fill="none"
            stroke="#fff"
            strokeOpacity=".55"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </svg>
      </span>
      <span className={cn(layer, "lp-flute-spark")}>
        <svg viewBox={MARK.viewBox} className="h-full w-full overflow-visible">
          <path d={MARK.spark} fill={BRAND.champagne} />
        </svg>
      </span>
    </span>
  );
}
