"use client";
import { haptic } from "@/lib/feedback";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Fire, Plus } from "@phosphor-icons/react";
import { useCouple, useCoupleEvent } from "@/features/couple/context";
import { Button, IconButton } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { Input } from "@/components/ui/field";
import { toast } from "@/components/ui/toast";
import { TIERS } from "@/lib/dark-logic";
import { darkFetch, useDarkState } from "./api";
import { SendSheet } from "./send-sheet";

interface Spin {
  spinId: string;
  tier: string;
  dare: string;
  needsMedia: boolean;
}

/** DARK-05 dare wheel: idle, spinning, closed matchbook, strike to reveal, Do it / Pass / Spin again. */
export function DareWheel() {
  const router = useRouter();
  const { partner, send } = useCouple();
  const { data: s } = useDarkState();
  const [deg, setDeg] = useState(0);
  const [phase, setPhase] = useState<"idle" | "spinning" | "matchbook" | "struck">("idle");
  const [spin, setSpin] = useState<Spin | null>(null);
  const [strike, setStrike] = useState(0);
  const [sendOpen, setSendOpen] = useState(false);
  const [custom, setCustom] = useState(false);
  const [text, setText] = useState("");
  const reduced =
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const open = TIERS.slice(0, s?.rank ?? 0);
  const segs = Array.from({ length: 8 }, (_, i) => open[i % Math.max(open.length, 1)] ?? "Flirty");
  const { data: hist, refetch } = useQuery({
    queryKey: ["dare-history"],
    queryFn: () =>
      darkFetch<{
        streak: number;
        history: Array<{ id: string; tier: string; outcome: string; text?: string; mine: boolean }>;
      }>("/api/dark/wheel"),
  });

  useCoupleEvent("dark.spin", (p) => toast(`${partner.name} spun: ${String(p.tier)}`));

  async function doSpin() {
    if (phase === "spinning") return;
    setPhase("spinning");
    setStrike(0);
    try {
      const r = await darkFetch<Spin>("/api/dark/wheel", {});
      const segIndex = segs.findIndex((t) => t === r.tier);
      const target = 360 - (segIndex * 45 + 22.5);
      const next = deg - (deg % 360) + 1440 + target + (Math.random() * 20 - 10);
      setDeg(next);
      send("dark.spin", { tier: r.tier });
      setTimeout(
        () => {
          setSpin(r);
          setPhase("matchbook");
        },
        reduced ? 400 : 3300,
      );
    } catch (e) {
      setPhase("idle");
      toast.err(e instanceof Error ? e.message : "The wheel stuck.");
    }
  }

  function struck() {
    setPhase("struck");
    haptic("heavy");
  }

  async function outcome(o: "done" | "passed" | "respun") {
    if (!spin) return;
    if (o === "done" && spin.needsMedia) return setSendOpen(true);
    await darkFetch(`/api/dark/wheel/${spin.spinId}`, { outcome: o });
    void refetch();
    setPhase("idle");
    setSpin(null);
    if (o === "passed") toast("Passed. No big deal.");
    if (o === "done") toast("Done. Nice.");
    if (o === "respun") setTimeout(doSpin, 50);
  }

  return (
    <main className="an-screen mx-auto flex min-h-dvh max-w-[640px] flex-col gap-4 px-4 pt-[calc(env(safe-area-inset-top)+8px)] pb-8 md:pt-8">
      <div className="flex items-center gap-3">
        <IconButton label="Back" onClick={() => router.push("/dark/home")}>
          <ArrowLeft size={20} />
        </IconButton>
        <div className="display flex-1 text-[28px]">Dare wheel</div>
        <span className="mono border-line text-muted rounded-full border px-3 py-1.5 text-xs">
          {open.map((t) => t.toUpperCase()).join(" · ") || "LOCKED"}
        </span>
      </div>
      <div className="relative flex min-h-[360px] flex-1 items-center justify-center">
        <div
          aria-hidden
          className="bg-ember absolute left-1/2 z-[2] -ml-3.5 h-7 w-7"
          style={{ top: "calc(50% - 168px)", clipPath: "polygon(0 0,100% 0,50% 100%)" }}
        />
        <div
          className="border-line relative h-[310px] w-[310px] rounded-full border-2"
          style={{
            transform: `rotate(${deg}deg)`,
            transition: reduced ? "none" : "transform 3.2s cubic-bezier(0.23,1,0.32,1)",
            background:
              "conic-gradient(#251A21 0 45deg,#31232C 45deg 90deg,#251A21 90deg 135deg,#31232C 135deg 180deg,#251A21 180deg 225deg,#31232C 225deg 270deg,#251A21 270deg 315deg,#31232C 315deg 360deg)",
          }}
          role="img"
          aria-label={`Wheel with ${open.join(", ")}`}
        >
          {segs.map((t, i) => (
            <div
              key={i}
              className="absolute top-1/2 left-1/2 h-0 w-0"
              style={{ transform: `rotate(${i * 45 + 22.5}deg)` }}
            >
              <span className="mono text-text absolute -top-[136px] -left-10 w-20 text-center text-[13px] tracking-[.06em]">
                {t}
              </span>
            </div>
          ))}
          <div className="bg-ember text-on-accent absolute top-1/2 left-1/2 -mt-9 -ml-9 flex h-[72px] w-[72px] items-center justify-center rounded-full">
            <Fire size={30} aria-hidden />
          </div>
        </div>
      </div>
      <Button disabled={phase === "spinning" || !open.length} onClick={doSpin}>
        {phase === "spinning" ? "Spinning" : "Spin"}
      </Button>
      <p className="text-faint m-0 text-center text-sm">
        Every dare has a free Pass. No counters, no guilt.
      </p>
      <div className="flex items-center justify-between">
        <div className="text-muted text-sm">
          {hist?.streak ? `${hist.streak}-day dare streak` : "Dare history"}
        </div>
        <Button variant="text" size="xs" className="text-ember" onClick={() => setCustom(true)}>
          <Plus size={16} aria-hidden /> Add your own dare
        </Button>
      </div>
      <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
        {(hist?.history ?? [])
          .filter((h) => h.outcome !== "respun")
          .slice(0, 6)
          .map((h) => (
            <li key={h.id} className="flex items-center gap-2 text-sm">
              <span className="mono text-faint w-16 flex-none text-[11px]">
                {h.tier.toUpperCase()}
              </span>
              <span className="text-muted flex-1 truncate">{h.text}</span>
              <span className="text-faint text-xs">{h.outcome === "done" ? "done" : "passed"}</span>
            </li>
          ))}
      </ul>

      {(phase === "matchbook" || phase === "struck") && spin && (
        <>
          <div
            aria-hidden
            className="an-fade fixed inset-0 z-30"
            style={{ background: "var(--scrim-strong)" }}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Your dare"
            className="an-sheet border-line bg-s1 fixed inset-x-0 bottom-0 z-[31] mx-auto flex max-w-[560px] flex-col gap-[18px] rounded-t-[20px] border-t px-5 pt-7 pb-[calc(36px+env(safe-area-inset-bottom))]"
            style={{ boxShadow: "var(--shadow-sheet)" }}
          >
            <div className="relative flex h-[200px] items-end justify-center">
              {phase === "struck" && (
                <span
                  aria-hidden
                  className="an-flame bg-warning absolute top-1 h-[30px] w-[30px]"
                  style={{
                    left: "calc(50% + 96px)",
                    borderRadius: "50% 0 50% 50%",
                    boxShadow: "inset -6px 6px 0 var(--accent-dark)",
                  }}
                />
              )}
              <div className="rounded-card bg-ember text-on-accent relative h-[170px] w-[250px] overflow-hidden p-[18px]">
                <div className="mono text-xs tracking-[.08em]">CLINK · AFTER DARK</div>
                <div className="display mt-2.5 text-[40px] leading-none">{spin.tier}</div>
                <div
                  aria-hidden
                  className="absolute inset-x-0 bottom-0 h-7"
                  style={{
                    background: "repeating-linear-gradient(90deg,#3A1A12 0 2px,#5A2A1E 2px 5px)",
                  }}
                />
              </div>
            </div>
            {phase === "matchbook" ? (
              <>
                <div className="text-muted text-center text-sm font-medium">
                  Swipe across the strip to strike
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={strike}
                  aria-label="Swipe to strike the match"
                  onChange={(e) =>
                    Number(e.target.value) >= 90 ? struck() : setStrike(Number(e.target.value))
                  }
                  className="h-11 w-full accent-[var(--accent-dark)]"
                />
                <Button variant="text" size="sm" className="text-muted" onClick={struck}>
                  Or tap to strike
                </Button>
              </>
            ) : (
              <>
                <div className="display an-reveal text-center text-[28px] leading-[1.1]">
                  {spin.dare}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Button size="lg" onClick={() => outcome("done")}>
                    Do it
                  </Button>
                  <Button size="lg" variant="secondary" onClick={() => outcome("passed")}>
                    Pass
                  </Button>
                  <Button
                    size="lg"
                    variant="ghost"
                    className="text-[15px]"
                    onClick={() => outcome("respun")}
                  >
                    Spin again
                  </Button>
                </div>
              </>
            )}
          </div>
        </>
      )}
      <SendSheet
        open={sendOpen}
        spinId={spin?.spinId}
        onClose={() => setSendOpen(false)}
        onSent={() => {
          setPhase("idle");
          setSpin(null);
          void refetch();
        }}
      />
      <Sheet open={custom} onOpenChange={setCustom} title="Add your own dare" handle>
        <div className="display text-[28px]">Your own dare</div>
        <Input
          aria-label="Dare"
          value={text}
          maxLength={280}
          placeholder="Something only you two would get"
          onChange={(e) => setText(e.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          {open.map((t) => (
            <Button
              key={t}
              variant="secondary"
              size="sm"
              disabled={text.trim().length < 3}
              onClick={async () => {
                await darkFetch("/api/dark/dares", { tier: t, text });
                setText("");
                setCustom(false);
                toast(`Added to ${t}.`);
              }}
            >
              Add to {t}
            </Button>
          ))}
        </div>
      </Sheet>
    </main>
  );
}
