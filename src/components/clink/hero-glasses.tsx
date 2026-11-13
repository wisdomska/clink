import { Wine } from "@phosphor-icons/react/dist/ssr";
import { Sparks } from "./sparks";

/** Landing hero: two halves, two glasses tilting in to clink, sparks at the touch point. */
export function HeroGlasses({ leftLabel = "LDN 21:14", rightLabel = "ACC 21:14" }: { leftLabel?: string; rightLabel?: string }) {
  return (
    <div className="relative grid h-[232px] grid-cols-2 overflow-hidden rounded-card border border-line md:h-[340px] lg:h-[440px]">
      <div className="relative flex items-center justify-end bg-s1">
        <Wine
          aria-hidden
          className="an-glassL -mr-2.5 h-[104px] w-[104px] text-text md:h-[150px] md:w-[150px]"
          style={{ transformOrigin: "50% 90%", transform: "rotate(-14deg)" }}
        />
        <span className="mono absolute bottom-3 left-3.5 text-xs text-muted">{leftLabel}</span>
      </div>
      <div className="relative flex items-center justify-start bg-s2">
        <Wine
          aria-hidden
          className="an-glassR -ml-2.5 h-[104px] w-[104px] text-accent md:h-[150px] md:w-[150px]"
          style={{ transformOrigin: "50% 90%", transform: "rotate(14deg)" }}
        />
        <span className="mono absolute right-3.5 bottom-3 text-xs text-muted">{rightLabel}</span>
      </div>
      <Sparks className="left-1/2 top-[34%]" />
    </div>
  );
}
