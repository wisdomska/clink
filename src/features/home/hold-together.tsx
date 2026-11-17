"use client";
import { create } from "zustand";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Heart, Sparkle } from "@phosphor-icons/react";
import { useCouple } from "@/features/couple/context";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { feedback } from "@/lib/feedback";
import { usePrefersReducedMotion } from "@/lib/hooks";
import { useClinkStore, vibrate } from "./clink-store";

export const useHold = create<{ holding: boolean; start: () => void; stop: () => void }>((set) => ({
  holding: false,
  start: () => set({ holding: true }),
  stop: () => set({ holding: false }),
}));

/**
 * Milestones for holding together. Each one adds to what came before: a beat,
 * then rising hearts, then a warm glow and bubbles, then the two of you lean
 * in, then fireworks, and so on. Same seconds on both screens.
 */
export const HOLD_MOMENTS = [
  { at: 5, name: "In sync", line: "Five seconds, same heartbeat." },
  { at: 10, name: "Heartbeat", line: "Hearts are rising." },
  { at: 20, name: "Bubbly", line: "Pop the champagne." },
  { at: 30, name: "Smitten", line: "Half a minute of just you two." },
  { at: 60, name: "One whole minute", line: "Fireworks, for the two of you." },
  { at: 120, name: "Inseparable", line: "Two minutes. Nobody's letting go." },
  { at: 300, name: "Legendary", line: "Five minutes. Frame this one." },
] as const;

export function holdLevel(secs: number): number {
  return HOLD_MOMENTS.filter((m) => secs >= m.at).length;
}

const BUZZ: number[][] = [
  [30],
  [30, 60, 30],
  [40, 50, 40, 50, 40],
  [60, 40, 60],
  [80, 40, 80, 40, 120],
  [100, 50, 100, 50, 100],
  [200, 80, 200, 80, 300],
];

/**
 * HOME-03: both partners hold the Clink button at once. Screens light up,
 * count the seconds held together and celebrate every milestone. Lifting the
 * finger anywhere, or "Let go", ends it. Holding alone calls your partner in.
 */
export function HoldTogether() {
  const { me, partner, send } = useCouple();
  const { holding, stop } = useHold();
  const partnerHolding = useClinkStore((s) => s.partnerHolding);
  const reduced = usePrefersReducedMotion();
  const [secs, setSecs] = useState(0);
  const secsRef = useRef(0);
  // Only say we notified them when a push actually went out.
  const [notified, setNotified] = useState(false);
  const together = holding && partnerHolding;
  const level = holdLevel(secs);
  const moment = level ? HOLD_MOMENTS[level - 1]! : null;
  // Reset the counter whenever a new hold starts (adjusting state on a prop change).
  const [prevHolding, setPrevHolding] = useState(holding);
  if (prevHolding !== holding) {
    setPrevHolding(holding);
    if (holding) {
      setSecs(0);
      setNotified(false);
    }
  }

  useEffect(() => {
    if (!holding) return;
    send("clink.hold", { holding: true });
    vibrate(30);
    secsRef.current = 0;
    const end = () => finish();
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
    // Re-announce so a partner who starts later still sees us.
    const ping = setInterval(() => send("clink.hold", { holding: true }), 2000);
    // Still alone after a moment? Ask them to come hold it too (push, at most every 2 min).
    const call = setTimeout(() => {
      if (!useClinkStore.getState().partnerHolding)
        void fetch("/api/clinks/hold-call", { method: "POST" })
          .then((r) => (r.ok ? r.json() : null))
          .then((d: { sent?: number } | null) => setNotified(Boolean(d?.sent)))
          .catch(() => undefined);
    }, 1200);
    return () => {
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
      clearInterval(ping);
      clearTimeout(call);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [holding]);

  useEffect(() => {
    if (!together) return;
    vibrate([20, 40, 20]);
    const t = setInterval(() => {
      secsRef.current += 1;
      setSecs(secsRef.current);
      const reached = HOLD_MOMENTS.findIndex((m) => m.at === secsRef.current);
      if (reached >= 0) {
        vibrate(BUZZ[reached]!);
        feedback("success", "clink");
      }
    }, 1000);
    return () => clearInterval(t);
  }, [together]);

  function finish() {
    if (!useHold.getState().holding) return;
    stop();
    send("clink.hold", { holding: false });
    const n = secsRef.current;
    if (n > 0) {
      void fetch("/api/clinks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "hold", holdSeconds: n, partnerOnline: true }),
      });
      const top = HOLD_MOMENTS[holdLevel(n) - 1];
      toast(`Held together for ${n} s${top ? `. ${top.name}.` : ""}`);
    } else {
      toast.err(`${partner.name} wasn't holding. Try again together.`);
    }
  }

  if (!holding) return null;
  const mm = String(Math.floor(secs / 60)).padStart(2, "0");
  const ss = String(secs % 60).padStart(2, "0");
  const next = HOLD_MOMENTS[level];
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="hold-title"
      className="an-fade-slow bg-app fixed inset-0 z-[32] flex touch-none flex-col items-center justify-center gap-5 overflow-hidden px-6 text-center select-none"
      style={{
        boxShadow: together ? "inset 0 0 0 3px var(--accent)" : "inset 0 0 0 1px var(--line)",
        transition: "box-shadow 320ms ease",
      }}
    >
      {together && !reduced && <HoldEffects level={level} />}

      <motion.div
        className="relative z-[1] flex"
        animate={
          together && level >= 1 && !reduced
            ? { scale: [1, 1.06, 1], transition: { duration: 0.9, repeat: Infinity } }
            : { scale: 1 }
        }
      >
        <motion.div
          animate={{ x: level >= 4 ? 10 : 0, rotate: level >= 4 ? 6 : 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 26 }}
          className="z-[1] -mr-2.5"
        >
          <Avatar
            name={me.name}
            side="me"
            size={88}
            ring={3}
            photoUrl={me.avatarUrl}
            icon={me.avatarIcon}
          />
        </motion.div>
        <motion.div
          animate={{ x: level >= 4 ? -10 : 0, rotate: level >= 4 ? -6 : 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 26 }}
        >
          <Avatar
            name={partner.name}
            side="partner"
            size={88}
            ring={3}
            photoUrl={partner.avatarUrl}
            icon={partner.avatarIcon}
            dim={!partnerHolding}
          />
        </motion.div>
      </motion.div>
      <div id="hold-title" className="display relative z-[1] text-[28px]">
        {together ? (moment ? moment.name : "Holding together") : "Hold on"}
      </div>
      <div
        className={`mono relative z-[1] text-[64px] ${level >= 7 ? "text-champagne" : "text-accent"}`}
        aria-live="off"
      >
        {mm}:{ss}
      </div>
      <div className="text-muted relative z-[1] text-base" aria-live="polite">
        {together
          ? next
            ? `${moment ? `${moment.line} ` : ""}Keep holding: something happens at ${next.at} s.`
            : `${moment?.line ?? ""} You did it all. Let go whenever.`
          : notified
            ? `Waiting for ${partner.name}. We sent them a notification to come hold too.`
            : `Waiting for ${partner.name}'s thumb. Ask them to hold too.`}
      </div>

      <AnimatePresence>
        {together && moment && (
          <motion.div
            key={moment.at}
            role="status"
            initial={{ opacity: 0, scale: 0.6, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 380, damping: 22 }}
            className="bg-s1 border-line pointer-events-none absolute top-[12%] z-[2] flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold shadow-[var(--shadow-float)]"
          >
            <Sparkle size={16} weight="fill" className="text-champagne" aria-hidden />
            {moment.at} s together: {moment.name}
          </motion.div>
        )}
      </AnimatePresence>

      <Button variant="ghost" size="lg" className="relative z-[1] mt-5 px-7" onClick={finish}>
        Let go
      </Button>
    </div>
  );
}

const rand = (seed: number) => {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
};

/** Everything that builds up behind the two of you while you hold. */
function HoldEffects({ level }: { level: number }) {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      {/* 3+: a warm glow breathing behind you. */}
      {level >= 3 && (
        <motion.div
          className="absolute top-1/2 left-1/2 h-[140vmax] w-[140vmax] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            background:
              "radial-gradient(closest-side, color-mix(in srgb, var(--accent) 28%, transparent), color-mix(in srgb, var(--champagne) 10%, transparent) 45%, transparent 70%)",
          }}
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: [0.6, 1, 0.6], scale: [0.95, 1.05, 0.95] }}
          transition={{ duration: 3, repeat: Infinity }}
        />
      )}
      {/* 6+: a slow champagne halo turning around the screen edge. */}
      {level >= 6 && (
        <motion.div
          className="absolute -inset-[30%]"
          style={{
            background:
              "conic-gradient(from 0deg, transparent, color-mix(in srgb, var(--champagne) 30%, transparent), transparent 30%, color-mix(in srgb, var(--accent) 30%, transparent), transparent 65%)",
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        />
      )}
      {/* 1+: a spark burst every time a new milestone lands. */}
      {level >= 1 && <Burst key={`burst-${level}`} count={10 + level * 4} big={level >= 4} />}
      {/* 2+: hearts rising. More of them as you go. */}
      {level >= 2 &&
        Array.from({ length: Math.min(4 + level * 3, 22) }, (_, i) => (
          <motion.span
            key={`h${i}`}
            className="absolute bottom-[-40px]"
            style={{
              left: `${rand(i + 1) * 100}%`,
              color: i % 3 === 0 ? "var(--blush)" : "var(--accent)",
            }}
            initial={{ y: 0, opacity: 0 }}
            animate={{ y: "-110vh", opacity: [0, 1, 1, 0], x: [0, 14, -10, 6] }}
            transition={{
              duration: 4 + rand(i + 7) * 3,
              delay: rand(i + 3) * 4,
              repeat: Infinity,
              ease: "easeOut",
            }}
          >
            <Heart size={14 + Math.round(rand(i + 5) * 18)} weight="fill" />
          </motion.span>
        ))}
      {/* 3+: champagne bubbles fizzing up. */}
      {level >= 3 &&
        Array.from({ length: 16 }, (_, i) => (
          <motion.span
            key={`b${i}`}
            className="border-champagne/70 absolute bottom-[-20px] rounded-full border"
            style={{
              left: `${rand(i + 40) * 100}%`,
              width: 6 + rand(i + 50) * 10,
              height: 6 + rand(i + 50) * 10,
            }}
            animate={{ y: "-105vh", opacity: [0, 0.9, 0] }}
            transition={{
              duration: 3 + rand(i + 60) * 3,
              delay: rand(i + 70) * 3,
              repeat: Infinity,
              ease: "easeIn",
            }}
          />
        ))}
      {/* 5+: fireworks popping around you. */}
      {level >= 5 &&
        Array.from({ length: level >= 7 ? 5 : 3 }, (_, i) => <Firework key={`f${i}`} i={i} />)}
    </div>
  );
}

function Burst({ count, big }: { count: number; big: boolean }) {
  return (
    <div className="absolute top-1/2 left-1/2">
      {Array.from({ length: count }, (_, i) => {
        const a = (i / count) * Math.PI * 2;
        const d = (big ? 220 : 140) + rand(i + 90) * 80;
        return (
          <motion.span
            key={i}
            className="absolute h-2 w-2 rounded-full"
            style={{ background: i % 2 ? "var(--champagne)" : "var(--accent)" }}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{ x: Math.cos(a) * d, y: Math.sin(a) * d, opacity: 0, scale: 0.4 }}
            transition={{ duration: 1.1, ease: [0.23, 1, 0.32, 1] }}
          />
        );
      })}
    </div>
  );
}

function Firework({ i }: { i: number }) {
  const left = 15 + rand(i + 100) * 70;
  const top = 12 + rand(i + 110) * 40;
  const n = 14;
  return (
    <div className="absolute" style={{ left: `${left}%`, top: `${top}%` }}>
      {Array.from({ length: n }, (_, k) => {
        const a = (k / n) * Math.PI * 2;
        return (
          <motion.span
            key={k}
            className="absolute h-1.5 w-1.5 rounded-full"
            style={{ background: k % 2 ? "var(--champagne)" : "var(--blush)" }}
            animate={{
              x: [0, Math.cos(a) * 70],
              y: [0, Math.sin(a) * 70 + 20],
              opacity: [0, 1, 0],
              scale: [0.5, 1, 0.3],
            }}
            transition={{
              duration: 1.4,
              delay: i * 0.6,
              repeat: Infinity,
              repeatDelay: 1.2 + rand(i + 120),
              ease: "easeOut",
            }}
          />
        );
      })}
    </div>
  );
}

/**
 * Your partner is holding the Clink and you're not: a card wherever you are
 * in the app. Press and hold its button to join them.
 */
export function HoldInvite() {
  const { partner } = useCouple();
  const partnerHolding = useClinkStore((s) => s.partnerHolding);
  const holding = useHold((s) => s.holding);
  const start = useHold((s) => s.start);
  const reduced = usePrefersReducedMotion();
  const show = partnerHolding && !holding;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          role="alertdialog"
          aria-labelledby="hold-invite-title"
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: -24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: reduced ? 0 : -16 }}
          className="border-line bg-s1 rounded-card fixed inset-x-3 top-[calc(env(safe-area-inset-top)+10px)] z-[31] mx-auto flex max-w-[480px] items-center gap-3 border p-3 pl-4 shadow-[var(--shadow-float)]"
        >
          <motion.span
            className="flex-none"
            animate={reduced ? undefined : { scale: [1, 1.08, 1] }}
            transition={{ duration: 0.9, repeat: Infinity }}
          >
            <Avatar
              name={partner.name}
              side="partner"
              size={44}
              photoUrl={partner.avatarUrl}
              icon={partner.avatarIcon}
            />
          </motion.span>
          <div className="min-w-0 flex-1">
            <div id="hold-invite-title" className="truncate text-base font-bold">
              {partner.name} is holding the Clink
            </div>
            <div className="text-muted text-sm">Press and hold to join them.</div>
          </div>
          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              start();
            }}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && start()}
            onContextMenu={(e) => e.preventDefault()}
            className="press bg-accent text-on-accent h-12 flex-none cursor-pointer touch-none rounded-full border-0 px-5 text-sm font-bold select-none"
          >
            Hold too
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
