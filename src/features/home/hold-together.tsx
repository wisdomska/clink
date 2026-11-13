"use client";
import { create } from "zustand";
import { useEffect, useRef, useState } from "react";
import { useCouple } from "@/features/couple/context";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { useClinkStore, vibrate } from "./clink-store";

export const useHold = create<{ holding: boolean; start: () => void; stop: () => void }>((set) => ({
  holding: false,
  start: () => set({ holding: true }),
  stop: () => set({ holding: false }),
}));

/**
 * HOME-03: both partners hold the Clink button at once. Screens glow and count
 * seconds held together. Lifting the finger anywhere, or "Let go", ends it.
 */
export function HoldTogether() {
  const { me, partner, send } = useCouple();
  const { holding, stop } = useHold();
  const partnerHolding = useClinkStore((s) => s.partnerHolding);
  const [secs, setSecs] = useState(0);
  const secsRef = useRef(0);
  const together = holding && partnerHolding;
  // Reset the counter whenever a new hold starts (adjusting state on a prop change).
  const [prevHolding, setPrevHolding] = useState(holding);
  if (prevHolding !== holding) {
    setPrevHolding(holding);
    if (holding) setSecs(0);
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
    return () => {
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
      clearInterval(ping);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [holding]);

  useEffect(() => {
    if (!together) return;
    vibrate([20, 40, 20]);
    const t = setInterval(() => {
      secsRef.current += 1;
      setSecs(secsRef.current);
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
      toast(`Held together for ${n} s`);
    } else {
      toast(`${partner.name} wasn't holding. Try again together.`);
    }
  }

  if (!holding) return null;
  const mm = String(Math.floor(secs / 60)).padStart(2, "0");
  const ss = String(secs % 60).padStart(2, "0");
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="hold-title"
      className="an-fade-slow bg-app fixed inset-0 z-[32] flex touch-none flex-col items-center justify-center gap-5 px-6 text-center select-none"
      style={{
        boxShadow: together
          ? "inset 0 0 140px var(--accent-glow-45)"
          : "inset 0 0 60px var(--accent-halo)",
        transition: "box-shadow 320ms ease",
      }}
    >
      <div className="flex">
        <Avatar
          name={me.name}
          side="me"
          size={88}
          ring={3}
          photoUrl={me.avatarUrl}
          icon={me.avatarIcon}
          className="z-[1] -mr-2.5"
        />
        <Avatar
          name={partner.name}
          side="partner"
          size={88}
          ring={3}
          photoUrl={partner.avatarUrl}
          icon={partner.avatarIcon}
          dim={!partnerHolding}
        />
      </div>
      <div id="hold-title" className="display text-[28px]">
        {together ? (
          <>
            Holding <em>together</em>
          </>
        ) : (
          <>
            Hold <em>on</em>
          </>
        )}
      </div>
      <div className="mono text-accent text-[64px]" aria-live="off">
        {mm}:{ss}
      </div>
      <div className="text-muted text-base" aria-live="polite">
        {together
          ? `${partner.name}'s thumb is on it too. Let go whenever.`
          : `Waiting for ${partner.name}'s thumb. Ask them to hold too.`}
      </div>
      <Button variant="ghost" size="lg" className="mt-5 px-7" onClick={finish}>
        Let go
      </Button>
    </div>
  );
}
