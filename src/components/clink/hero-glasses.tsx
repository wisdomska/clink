import { Wine } from "@phosphor-icons/react/dist/ssr";
import { Sparks } from "./sparks";

/** Landing hero: two halves, two glasses tilting in to clink, sparks at the touch point. */
export function HeroGlasses({
  leftLabel = "LDN 21:14",
  rightLabel = "ACC 21:14",
}: {
  leftLabel?: string;
  rightLabel?: string;
}) {
  return (
    <div className="rounded-card border-line relative grid h-[232px] grid-cols-2 overflow-hidden border md:h-[340px] lg:h-[440px]">
      <div className="bg-s1 relative flex items-center justify-end">
        <Wine
          aria-hidden
          className="an-glassL text-text -mr-2.5 h-[104px] w-[104px] md:h-[150px] md:w-[150px]"
          style={{ transformOrigin: "50% 90%", transform: "rotate(-14deg)" }}
        />
        <span className="mono text-muted absolute bottom-3 left-3.5 text-xs">{leftLabel}</span>
      </div>
      <div className="bg-s2 relative flex items-center justify-start">
        <Wine
          aria-hidden
          className="an-glassR text-accent -ml-2.5 h-[104px] w-[104px] md:h-[150px] md:w-[150px]"
          style={{ transformOrigin: "50% 90%", transform: "rotate(14deg)" }}
        />
        <span className="mono text-muted absolute right-3.5 bottom-3 text-xs">{rightLabel}</span>
      </div>
      <Sparks className="top-[34%] left-1/2" />
    </div>
  );
}
