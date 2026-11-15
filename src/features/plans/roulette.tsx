"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, animate, useMotionValue, useTransform, type MotionValue } from "motion/react";
import { ArrowLeft, Shuffle } from "@phosphor-icons/react";
import { Button, IconButton } from "@/components/ui/button";
import { Display } from "@/components/ui/heading";
import { Confetti } from "@/components/fx/confetti";
import { feedback, useReducedMotion } from "@/lib/feedback";
import { useKits } from "./data";
import { ScheduleSheet } from "./kit-detail";

const ROW = 64;
const VISIBLE = 5; // rows in the window; the middle one is the pick

/** One row of the drum: tilts away and fades as it leaves the centre. */
function ReelRow({ i, y, title }: { i: number; y: MotionValue<number>; title: string }) {
  const centre = Math.floor(VISIBLE / 2) * ROW;
  const d = useTransform(y, (v) => (i * ROW + v - centre) / ROW); // rows from centre
  const rotateX = useTransform(d, (x) => Math.max(-70, Math.min(70, x * -24)));
  const opacity = useTransform(d, (x) => Math.max(0.12, 1 - Math.abs(x) * 0.38));
  const scale = useTransform(d, (x) => 1 - Math.min(0.18, Math.abs(x) * 0.07));
  return (
    <motion.div
      aria-hidden
      className="display absolute inset-x-0 flex items-center justify-center px-6 text-center text-[26px] leading-none"
      style={{ top: i * ROW, height: ROW, y, rotateX, opacity, scale }}
    >
      <span className="truncate">{title}</span>
    </motion.div>
  );
}

/** DATE-03: spin a drum of kits, decelerating onto tonight's pick. Re-spin allowed. */
export function Roulette() {
  const router = useRouter();
  const { data: kits = [] } = useKits();
  const reduced = useReducedMotion();
  const [phase, setPhase] = useState<"idle" | "spinning" | "result">("idle");
  const [idx, setIdx] = useState(0);
  const [open, setOpen] = useState(false);
  const [burst, setBurst] = useState(0);
  const n = kits.length || 1;
  const LAPS = 6;
  const reel = Array.from({ length: LAPS + 2 }, () => kits).flat();
  // y = offset of the reel; row r sits in the centre when y = -(r - centre) * ROW.
  const centre = Math.floor(VISIBLE / 2);
  const y = useMotionValue(centre * ROW);
  const lastRow = useRef(0);

  // A soft tick each time a row crosses the centre, slowing as the drum does.
  useEffect(
    () =>
      y.on("change", (v) => {
        const row = Math.round((centre * ROW - v) / ROW);
        if (row !== lastRow.current && phase === "spinning") {
          lastRow.current = row;
          feedback("tap", "tick");
        }
      }),
    [y, phase, centre],
  );

  function spin() {
    if (!kits.length) return;
    const pick = Math.floor(Math.random() * n);
    // Start from the current pick's lap-0 position so every spin travels forward.
    const from = centre * ROW - idx * ROW;
    y.set(from);
    lastRow.current = idx;
    const target = LAPS * n + pick;
    setPhase("spinning");
    feedback("select");
    void animate(y, centre * ROW - target * ROW, {
      duration: reduced ? 0.3 : 3.1,
      ease: [0.12, 0.75, 0.18, 1],
    }).then(() => {
      setIdx(pick);
      y.set(centre * ROW - pick * ROW);
      setPhase("result");
      setBurst((b) => b + 1);
      feedback("success", "win");
    });
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
      <div className="relative flex items-center gap-4">
        <motion.img
          src="/art/slot.webp"
          alt=""
          aria-hidden
          className="h-20 w-20 flex-none object-contain drop-shadow-[0_10px_14px_rgba(0,0,0,.45)]"
          animate={
            phase === "spinning" ? { rotate: [0, -8, 8, -6, 6, 0], y: [0, -3, 0] } : { rotate: 0 }
          }
          transition={
            phase === "spinning" ? { duration: 0.5, repeat: Infinity } : { type: "spring" }
          }
        />
        <p className="text-muted m-0 text-base leading-snug">
          Can&apos;t decide? Let the drum pick a date kit for you two.
        </p>
      </div>
      <div
        role="status"
        className="rounded-card relative flex-none overflow-hidden border border-[var(--line)]"
        style={{
          height: ROW * VISIBLE,
          perspective: 700,
          background:
            "radial-gradient(90% 60% at 50% 50%, color-mix(in oklab, var(--accent) 14%, transparent), transparent 70%), linear-gradient(var(--surface-1), var(--surface-2) 50%, var(--surface-1))",
        }}
        aria-live="polite"
        aria-label={
          phase === "result" && pick ? `Tonight's pick: ${pick.title}` : "Date roulette reel"
        }
      >
        {/* The pick sits on a soft glowing band, not between lines. */}
        <motion.div
          aria-hidden
          className="absolute inset-x-3 rounded-2xl"
          style={{
            top: centre * ROW + 4,
            height: ROW - 8,
            background: "color-mix(in oklab, var(--accent) 16%, transparent)",
            boxShadow: "0 0 40px -6px color-mix(in oklab, var(--accent) 55%, transparent)",
          }}
          animate={phase === "result" ? { scale: [1, 1.04, 1] } : { scale: 1 }}
          transition={{ duration: 0.45 }}
        />
        <div className="absolute inset-0" style={{ transformStyle: "preserve-3d" }}>
          {reel.map((k, i) => (
            <ReelRow key={i} i={i} y={y} title={k.title} />
          ))}
        </div>
        {phase === "result" && !reduced && (
          <div key={burst} className="pointer-events-none absolute inset-0">
            <Confetti count={28} seed={burst} />
          </div>
        )}
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
      <Button softDisabled={!kits.length} loading={phase === "spinning"} onClick={spin}>
        <Shuffle size={20} aria-hidden />
        {phase === "result" ? "Spin again" : "Spin"}
      </Button>
      {pick && (
        <ScheduleSheet kitId={pick.id} title={pick.title} open={open} onOpenChange={setOpen} />
      )}
    </div>
  );
}
