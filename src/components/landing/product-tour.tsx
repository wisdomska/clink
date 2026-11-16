"use client";
import { useRef, useState } from "react";
import {
  motion,
  useMotionValueEvent,
  useInView,
  useScroll,
  useTransform,
  type MotionValue,
} from "motion/react";
import { Device } from "./device";
import { useReducedMotion } from "@/lib/feedback";
import { cn } from "@/components/ui/cn";

export interface TourStep {
  id: string;
  title: string;
  body: string;
  screen: React.ReactNode;
}

/** One screen inside the sticky device: fades and lifts in over its slice of the scroll. */
function Layer({
  i,
  n,
  progress,
  active,
  still,
  children,
}: {
  i: number;
  n: number;
  progress: MotionValue<number>;
  active: boolean;
  still: boolean;
  children: React.ReactNode;
}) {
  const a = i / n;
  const b = (i + 1) / n;
  const f = 0.04;
  const first = i === 0;
  const last = i === n - 1;
  const opacity = useTransform(
    progress,
    first ? [-1, -0.5, b - f, b + f] : last ? [a - f, a + f, 2, 3] : [a - f, a + f, b - f, b + f],
    first ? [1, 1, 1, 0] : last ? [0, 1, 1, 1] : [0, 1, 1, 0],
  );
  const y = useTransform(progress, [a - f, a + f], [first ? 0 : 36, 0]);
  return (
    <motion.div
      data-active={active}
      className="absolute inset-0 flex flex-col"
      style={still ? { opacity: active ? 1 : 0 } : { opacity, y }}
    >
      {children}
    </motion.div>
  );
}

/** Small screens: each step's own device, which starts its screen once it's in view. */
function InlineDevice({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const seen = useInView(ref, { once: true, amount: 0.4 });
  return (
    <div ref={ref} data-reveal className="flex justify-center lg:hidden">
      <Device>
        <div data-active={seen} className="absolute inset-0 flex flex-col">
          {children}
        </div>
      </Device>
    </div>
  );
}

/**
 * Scroll-driven product tour. On large screens the device stays pinned while
 * the steps scroll past, and its screen follows the step you're reading. On
 * smaller screens every step carries its own device, stacked.
 */
export function ProductTour({ steps }: { steps: TourStep[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const still = useReducedMotion();
  const [active, setActive] = useState(0);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.5", "end 0.5"] });
  const fill = useTransform(scrollYProgress, [0, 1], [0, 1]);
  const n = steps.length;

  useMotionValueEvent(scrollYProgress, "change", (p) => {
    const next = Math.min(n - 1, Math.max(0, Math.floor(p * n)));
    if (next !== active) setActive(next);
  });

  return (
    <div ref={ref} className="relative grid gap-16 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-20">
      <ol className="relative m-0 list-none p-0 lg:pl-10">
        {/* Progress rail (large screens) */}
        <span aria-hidden className="bg-line absolute top-0 bottom-0 left-0 hidden w-px lg:block">
          <motion.span
            className="bg-accent absolute inset-0 origin-top"
            style={{ scaleY: still ? 1 : fill }}
          />
        </span>
        {steps.map((s, i) => (
          <li
            key={s.id}
            className="flex flex-col gap-8 py-6 lg:min-h-[78vh] lg:justify-center lg:py-0"
          >
            <div data-reveal className="max-w-[30rem]">
              <h3
                className={cn(
                  "display m-0 text-[clamp(2rem,4vw,3.5rem)] leading-[1] tracking-[-0.03em] transition-colors duration-500",
                  i === active ? "lg:text-text" : "lg:text-faint",
                )}
              >
                {s.title}
              </h3>
              <p className="text-muted mt-4 mb-0 text-lg leading-relaxed text-pretty">{s.body}</p>
            </div>
            <InlineDevice>{s.screen}</InlineDevice>
          </li>
        ))}
      </ol>
      <div className="hidden lg:block">
        <div className="sticky top-[max(5.5rem,calc(50vh-310px))] py-2">
          <Device>
            {steps.map((s, i) => (
              <Layer
                key={s.id}
                i={i}
                n={n}
                progress={scrollYProgress}
                active={i === active}
                still={still}
              >
                {s.screen}
              </Layer>
            ))}
          </Device>
        </div>
      </div>
    </div>
  );
}
