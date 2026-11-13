"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Moon, DeviceMobileCamera } from "@phosphor-icons/react";
import { useCouple } from "@/features/couple/context";
import { Button, IconButton } from "@/components/ui/button";
import { Display, Lead } from "@/components/ui/heading";
import { FieldError } from "@/components/ui/field";
import { PinPad, PinDots } from "./pin-pad";
import { TIERS } from "@/lib/dark-logic";

/** Flow 10.3: honest intro, PIN twice, choose tiers. Nothing opens until both say yes. */
export function DarkSetup() {
  const router = useRouter();
  const { partner } = useCouple();
  const [step, setStep] = useState<"intro" | "pin" | "confirm" | "tiers">("intro");
  const [pin, setPin] = useState("");
  const [first, setFirst] = useState("");
  const [tiers, setTiers] = useState<string[]>(["Flirty"]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function key(k: string) {
    if (k === "del") return setPin((p) => p.slice(0, -1));
    const p = pin + k;
    if (p.length > 4) return;
    setPin(p);
    if (p.length === 4) {
      setTimeout(() => {
        if (step === "pin") {
          setFirst(p);
          setPin("");
          setStep("confirm");
        } else if (p === first) {
          setPin("");
          setError(null);
          setStep("tiers");
        } else {
          setError("Those didn't match. Start again.");
          setPin("");
          setFirst("");
          setStep("pin");
        }
      }, 150);
    }
  }

  async function finish() {
    setBusy(true);
    const r = await fetch("/api/dark/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin: first, tiers: tiers.filter((t) => t !== "Unhinged") }),
    });
    setBusy(false);
    if (!r.ok) return setError((await r.json()).message);
    router.replace("/dark/home");
    router.refresh();
  }

  return (
    <main className="an-screen mx-auto flex min-h-dvh max-w-[480px] flex-col px-5 pt-[calc(env(safe-area-inset-top)+12px)] pb-10">
      <IconButton
        label="Back"
        onClick={() => (step === "intro" ? router.push("/settings") : setStep("intro"))}
      >
        <ArrowLeft size={20} />
      </IconButton>
      {step === "intro" && (
        <div className="an-reveal flex flex-1 flex-col">
          <Moon size={36} className="text-ember mt-6" aria-hidden />
          <Display size={48} className="mt-3">
            After <em>Dark</em>
          </Display>
          <Lead className="mt-3">
            A private space for the two of you. Spicy decks, a dare wheel, a vault. It stays hidden
            until you both say yes, and the lower choice always wins.
          </Lead>
          <div className="mt-6 flex flex-col gap-3 text-base leading-normal">
            <p className="m-0">Every dare and question has a free Pass. No counters, no guilt.</p>
            <p className="m-0">
              You choose how long anything you send lasts, and you can unsend it any time.
            </p>
            <p className="m-0 flex gap-2.5">
              <DeviceMobileCamera size={22} className="text-ember flex-none" aria-hidden />
              They can still screenshot. We blur, watermark and delete on schedule, but no app can
              stop a screenshot.
            </p>
          </div>
          <div className="min-h-6 flex-1" />
          <Button className="bg-ember" onClick={() => setStep("pin")}>
            Set a PIN
          </Button>
          <p className="text-faint mt-3 text-center text-sm">
            {partner.name} won&apos;t see anything here until they opt in too.
          </p>
        </div>
      )}
      {(step === "pin" || step === "confirm") && (
        <div className="flex flex-1 flex-col items-center">
          <Display size={36} className="mt-6 text-center">
            {step === "pin" ? (
              <>
                Pick a <em>PIN</em>
              </>
            ) : (
              <>
                Once <em>more</em>
              </>
            )}
          </Display>
          <p className="text-muted mt-2 mb-0 text-center text-base">
            4 digits. Different from your phone&apos;s, ideally.
          </p>
          <FieldError>{error}</FieldError>
          <PinDots n={4} filled={pin.length} wrong={false} shake={false} />
          <PinPad onKey={key} />
        </div>
      )}
      {step === "tiers" && (
        <div className="an-reveal flex flex-1 flex-col">
          <Display size={36} className="mt-6">
            How far, <em>for now</em>?
          </Display>
          <Lead className="mt-2">
            Pick what you&apos;re up for. A tier opens only when {partner.name} picks it too. You
            can change this any time.
          </Lead>
          <div className="mt-6 flex flex-col gap-2" role="group" aria-label="Tiers">
            {TIERS.map((t, i) => {
              const on = tiers.includes(t);
              const locked = t === "Unhinged";
              return (
                <button
                  key={t}
                  type="button"
                  disabled={locked}
                  aria-pressed={on}
                  onClick={() =>
                    setTiers(
                      on
                        ? TIERS.slice(0, i)
                        : TIERS.slice(0, i + 1).filter((x) => x !== "Unhinged"),
                    )
                  }
                  className="press rounded-card bg-s2 text-text flex min-h-16 cursor-pointer items-center justify-between gap-3 px-[18px] text-left disabled:cursor-default disabled:opacity-60"
                  style={{ border: on ? "2px solid var(--accent-dark)" : "1px solid var(--line)" }}
                >
                  <span className="display text-[24px] tracking-normal">{t}</span>
                  <span className="text-muted text-sm">
                    {locked ? "Needs you both verified, later" : on ? "Yes" : "Not yet"}
                  </span>
                </button>
              );
            })}
          </div>
          <FieldError>{error}</FieldError>
          <div className="min-h-6 flex-1" />
          <Button className="bg-ember" disabled={busy} onClick={finish}>
            Open After Dark
          </Button>
        </div>
      )}
    </main>
  );
}
