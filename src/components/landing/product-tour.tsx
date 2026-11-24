"use client";
import { useEffect, useRef, useState } from "react";
import { Device } from "./device";
import { useScrollProgress } from "./use-scroll-progress";
import { useReducedMotion } from "@/lib/feedback";
import { cn } from "@/components/ui/cn";

export interface TourStep {
  id: string;
  title: string;
  body: string;
  screen: React.ReactNode;
}

/** Half the cross-fade between two screens, as a share of the whole tour's scroll. */
const F = 0.04;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/**
 * Screen i of n at scroll progress p: it fades and lifts in over its own slice
 * and fades out as the next arrives. The first starts shown, the last stays.
 */
function layerStyle(i: number, n: number, p: number) {
  const a = i / n;
  const b = (i + 1) / n;
  const rise = i === 0 ? 1 : clamp01((p - (a - F)) / (2 * F));
  const fall = i === n - 1 ? 0 : clamp01((p - (b - F)) / (2 * F));
  return { opacity: Math.min(rise, 1 - fall), y: i === 0 ? 0 : 36 * (1 - rise) };
}

/** Small screens: each step's own device, which starts its screen once it's in view. */
function InlineDevice({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e?.isIntersecting) return;
        setSeen(true);
        io.disconnect();
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} data-reveal data-loop data-paused className="flex justify-center lg:hidden">
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
  const rail = useRef<HTMLSpanElement>(null);
  const layers = useRef<(HTMLDivElement | null)[]>([]);
  const still = useReducedMotion();
  const [active, setActive] = useState(0);
  const n = steps.length;

  // Written straight to the elements each frame, like Motion did: no re-render per scroll.
  useScrollProgress(ref, 0.5, 0.5, (p) => {
    setActive(Math.min(n - 1, Math.max(0, Math.floor(p * n))));
    if (still) return;
    if (rail.current) rail.current.style.transform = `scaleY(${p})`;
    layers.current.forEach((el, i) => {
      if (!el) return;
      const { opacity, y } = layerStyle(i, n, p);
      el.style.opacity = String(opacity);
      el.style.transform = y ? `translateY(${y}px)` : "none";
    });
  });

  return (
    <div ref={ref} className="relative grid gap-16 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-20">
      <ol className="relative m-0 list-none p-0 lg:pl-10">
        {/* Progress rail (large screens) */}
        <span aria-hidden className="bg-line absolute top-0 bottom-0 left-0 hidden w-px lg:block">
          <span
            ref={rail}
            className="bg-accent absolute inset-0 origin-top"
            style={{ transform: `scaleY(${still ? 1 : 0})` }}
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
        <div data-loop data-paused className="sticky top-[max(5.5rem,calc(50vh-310px))] py-2">
          <Device>
            {steps.map((s, i) => {
              const start = layerStyle(i, n, 0);
              return (
                <div
                  key={s.id}
                  ref={(el) => {
                    layers.current[i] = el;
                  }}
                  data-active={i === active}
                  className="absolute inset-0 flex flex-col"
                  style={
                    still
                      ? { opacity: i === active ? 1 : 0 }
                      : {
                          opacity: start.opacity,
                          transform: start.y ? `translateY(${start.y}px)` : "none",
                        }
                  }
                >
                  {s.screen}
                </div>
              );
            })}
          </Device>
        </div>
      </div>
    </div>
  );
}
