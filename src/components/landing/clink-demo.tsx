"use client";
import { useRef, useState } from "react";
import { Portrait, SKY } from "./portrait";
import { Heart } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/components/ui/cn";
import { Flutes } from "./flutes";
import { useStill } from "./use-still";
import { haptic, playSound } from "@/lib/feedback";

function reply(n: number) {
  if (n >= 10) return "Theo: get on a plane";
  if (n >= 5) return "Theo: okay, I miss you too";
  if (n >= 3) return "Theo sent one back";
  return "Theo felt it";
}

/**
 * Try the core gesture: tap the glasses, they clink, a heart crosses the
 * room and Theo's side reacts. Vibrates where the device allows. Each tap
 * remounts the animated pieces (keyed by the count), which replays their CSS
 * animations (landing.css, "demo").
 */
export function ClinkDemo() {
  const [count, setCount] = useState(0);
  const [travel, setTravel] = useState({ x: 0, y: 0 });
  const still = useStill();
  const btn = useRef<HTMLButtonElement>(null);
  const theo = useRef<HTMLDivElement>(null);

  const send = () => {
    if (btn.current && theo.current) {
      const a = btn.current.getBoundingClientRect();
      const b = theo.current.getBoundingClientRect();
      setTravel({
        x: b.left + b.width / 2 - (a.left + a.width / 2),
        y: b.top + b.height / 2 - (a.top + a.height / 2),
      });
    }
    setCount((c) => c + 1);
    haptic("send");
    playSound("clink");
  };

  return (
    <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-20">
      <div data-reveal>
        <h2
          id="try-title"
          className="display m-0 text-[clamp(2.5rem,5.5vw,4.75rem)] leading-[0.98] tracking-[-0.03em]"
        >
          Go on, send one.
        </h2>
        <p className="text-muted mt-5 mb-0 max-w-[38ch] text-lg leading-relaxed text-pretty">
          That&apos;s the whole idea. One tap here, and their device buzzes wherever they are.
        </p>
        <div className="mt-10 flex items-baseline gap-3" aria-live="polite" aria-atomic="true">
          <span className="mono text-text text-[64px] leading-none tracking-[-0.04em]">
            {count}
          </span>{" "}
          <span className="text-muted text-base">{count === 1 ? "clink sent" : "clinks sent"}</span>
        </div>
      </div>

      <div
        data-reveal
        style={{ ["--d" as string]: 1 }}
        className="rounded-card border-line bg-s1 relative grid h-[380px] grid-cols-2 overflow-hidden border sm:h-[440px]"
      >
        <div style={{ background: SKY.warm }} />
        <div style={{ background: SKY.night }} />
        <div aria-hidden className="bg-line absolute inset-y-0 left-1/2 w-px" />

        {/* Ama (you) */}
        <div className="absolute bottom-5 left-5 flex flex-col items-start gap-2" aria-hidden>
          <Portrait
            who="ama"
            src="/memoji/w1-hearteyes.webp"
            className="h-[72px] w-[72px] sm:h-[88px] sm:w-[88px]"
            sizes="112px"
          />
          <span className="text-text text-sm font-bold">You</span>
        </div>

        {/* Theo: his portrait bounces when the clink lands. */}
        <div className="absolute right-5 bottom-5 flex flex-col items-end gap-2" aria-hidden>
          <div key={count} ref={theo} className={cn(!still && count > 0 && "lp-bounce")}>
            <Portrait
              who="theo"
              src="/memoji/m6-hearteyes.webp"
              className="h-[72px] w-[72px] sm:h-[88px] sm:w-[88px]"
              sizes="112px"
            />
          </div>
          <span className="text-text text-sm font-bold">Theo</span>
        </div>

        {count > 0 && (
          <div
            key={count}
            aria-hidden
            className={cn(
              "bg-s3/90 border-line text-text absolute right-5 bottom-[132px] flex items-center gap-1.5 rounded-full border py-1.5 pr-3 pl-2 text-sm font-medium backdrop-blur-sm sm:bottom-[148px]",
              !still && "lp-reply",
            )}
          >
            <span className="bg-accent text-on-accent flex h-5 w-5 items-center justify-center rounded-full">
              <Heart size={12} weight="fill" />
            </span>
            {reply(count)}
          </div>
        )}

        {/* The button, centred over the seam */}
        <div className="absolute inset-0 flex items-center justify-center pb-10">
          <div className="relative">
            {count > 0 && !still && (
              <span
                key={`r${count}`}
                aria-hidden
                className="lp-ring border-accent absolute inset-0 rounded-full border-2"
              />
            )}
            {count > 0 && !still && (
              <span
                key={`h${count}`}
                aria-hidden
                className="lp-heart bg-accent text-on-accent absolute top-1/2 left-1/2 -mt-4 -ml-4 flex h-8 w-8 items-center justify-center rounded-full"
                style={{ ["--tx" as string]: `${travel.x}px`, ["--ty" as string]: `${travel.y}px` }}
              >
                <Heart size={16} weight="fill" />
              </span>
            )}
            <button
              ref={btn}
              type="button"
              onClick={send}
              className="press bg-app border-line-strong hover:border-accent relative flex h-[176px] w-[176px] flex-col items-center justify-center gap-2 rounded-full border-[1.5px] transition-colors sm:h-[200px] sm:w-[200px]"
            >
              <span className="block h-[92px] w-[74px] sm:h-[104px] sm:w-[84px]">
                <Flutes
                  mode="once"
                  playKey={count}
                  still={still || count === 0}
                  className="h-full w-full"
                />
              </span>
              <span className="text-text text-sm font-bold">
                Tap to clink<span className="sr-only"> to Theo</span>
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
