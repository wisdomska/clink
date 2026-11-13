"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Shuffle } from "@phosphor-icons/react";
import { Button, IconButton } from "@/components/ui/button";
import { Display } from "@/components/ui/heading";
import { useKits } from "./data";
import { ScheduleSheet } from "./kit-detail";

const ROW = 56;

/** DATE-03: spin a reel of kits, decelerating onto tonight's pick. Re-spin allowed. */
export function Roulette() {
  const router = useRouter();
  const { data: kits = [] } = useKits();
  const [y, setY] = useState(0);
  const [phase, setPhase] = useState<"idle" | "reset" | "spinning" | "result">("idle");
  const [idx, setIdx] = useState(0);
  const [open, setOpen] = useState(false);
  const reduced =
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const reel = Array.from({ length: 4 }, () => kits).flat();
  const n = kits.length || 1;

  function spin() {
    const pick = Math.floor(Math.random() * n);
    setPhase("reset");
    setY(0);
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        setPhase("spinning");
        setY(-((3 * n + pick - 1) * ROW));
        setIdx(pick);
        setTimeout(() => setPhase("result"), reduced ? 300 : 2500);
      }),
    );
  }
  const pick = kits[idx];
  return (
    <div className="screen an-screen flex min-h-[calc(100dvh-var(--chrome-bottom))] max-w-[640px] flex-col gap-5">
      <IconButton label="Back" onClick={() => router.push("/plans")}>
        <ArrowLeft size={20} />
      </IconButton>
      <Display size={48}>
        Date <em>roulette</em>
      </Display>
      <div
        className="rounded-card border-line bg-s1 relative h-[168px] flex-none overflow-hidden border"
        aria-live="polite"
        aria-label={
          phase === "result" && pick ? `Tonight's pick: ${pick.title}` : "Date roulette reel"
        }
      >
        <div
          style={{
            transform: `translateY(${y}px)`,
            transition:
              phase === "spinning" && !reduced
                ? "transform 2.4s cubic-bezier(0.23,1,0.32,1)"
                : "none",
          }}
        >
          {reel.map((k, i) => (
            <div
              key={i}
              className="display text-muted flex h-14 items-center justify-center text-[28px]"
              aria-hidden
            >
              {k.title}
            </div>
          ))}
        </div>
        <div className="border-accent pointer-events-none absolute inset-x-3 top-14 h-14 border-y-2" />
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: "linear-gradient(#18161B, transparent 35%, transparent 65%, #18161B)",
          }}
        />
      </div>
      {phase === "result" && pick && (
        <div className="an-reveal rounded-card bg-s2 flex flex-col gap-2.5 p-[18px]">
          <div className="mono text-muted text-xs">TONIGHT&apos;S PICK</div>
          <div className="display text-[36px] leading-none">{pick.title}</div>
          <div className="text-muted text-sm">{pick.blurb}</div>
          <div className="flex flex-wrap gap-2">
            <Button size="md" onClick={() => setOpen(true)}>
              Schedule it
            </Button>
            <Button size="md" variant="ghost" onClick={() => router.push(`/plans/kits/${pick.id}`)}>
              See the kit
            </Button>
          </div>
        </div>
      )}
      <div className="flex-1" />
      <Button
        variant="secondary"
        disabled={phase === "spinning" || !kits.length}
        onClick={spin}
        className="font-bold"
      >
        <Shuffle size={20} aria-hidden />
        {phase === "result" ? "Spin again" : "Spin"}
      </Button>
      {pick && (
        <ScheduleSheet kitId={pick.id} title={pick.title} open={open} onOpenChange={setOpen} />
      )}
    </div>
  );
}
