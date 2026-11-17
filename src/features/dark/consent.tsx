"use client";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "motion/react";
import { Check } from "@phosphor-icons/react";
import { useCouple } from "@/features/couple/context";
import { Lead, PartnerMark } from "@/components/ui/heading";
import { toast } from "@/components/ui/toast";
import { cn } from "@/components/ui/cn";
import { feedback } from "@/lib/feedback";
import { TIERS, contiguousRank } from "@/lib/dark-logic";
import { useDarkState, darkFetch } from "./api";
import { PageBar } from "@/components/clink/page-bar";

const BLURB: Record<string, string> = {
  Flirty: "Teasing, compliments, a little heat.",
  Steamy: "Turned up. Suggestive dares and questions.",
  Spicy: "Explicit talk and bolder dares.",
  Unhinged: "No holding back. Everything is on.",
};

/**
 * /dark/consent: one tap sets how far you go. Everything up to that level is
 * on for you; a level opens for both once you've both picked it. Saves straight away.
 */
export function Consent() {
  const qc = useQueryClient();
  const { partner } = useCouple();
  const { data: s } = useDarkState();
  const [draft, setDraft] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const mine = draft ?? contiguousRank(s?.me.tiers ?? []);
  const theirs = contiguousRank(s?.partner.tiers ?? []);

  async function pick(level: number) {
    if (busy) return;
    const prev = mine;
    setDraft(level);
    setBusy(true);
    feedback("select");
    try {
      await darkFetch("/api/dark/consent", { tiers: TIERS.slice(0, level) });
      await qc.invalidateQueries({ queryKey: ["dark-state"] });
      toast.ok(level ? `You're at ${TIERS[level - 1]}.` : "All tiers off for you.");
    } catch (e) {
      setDraft(prev);
      toast.err(e instanceof Error ? e.message : "Couldn't save that. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="an-screen mx-auto flex min-h-dvh max-w-[560px] flex-col gap-5 px-5 pt-[var(--screen-pt)] pb-10 [--screen-pt:calc(env(safe-area-inset-top)+12px)] md:[--screen-pt:2.5rem]">
      <PageBar
        title={
          <>
            How <em>far</em>?
          </>
        }
        back="/dark/home"
      />
      <Lead>
        Tap a level. It opens for you both once {partner.name} picks it too. Go lower any time;{" "}
        {partner.name} only sees &quot;After Dark settings changed&quot;.
      </Lead>
      <div className="flex flex-col gap-2" role="radiogroup" aria-label="Your level">
        {TIERS.map((t, i) => {
          const level = i + 1;
          const on = mine >= level;
          const top = mine === level;
          const both = on && theirs >= level;
          return (
            <motion.button
              key={t}
              type="button"
              role="radio"
              aria-checked={top}
              disabled={busy}
              whileTap={{ scale: 0.98 }}
              onClick={() => pick(top ? level - 1 : level)}
              className={cn(
                "rounded-card text-text relative flex min-h-[72px] cursor-pointer items-center justify-between gap-3 overflow-hidden border px-[18px] text-left transition-colors",
                on ? "border-ember/60 bg-ember/10" : "border-line bg-s2",
              )}
            >
              <span className="min-w-0">
                <span className="display block text-[22px] tracking-normal">{t}</span>
                <span className="text-muted block text-sm">{BLURB[t]}</span>
              </span>
              <span className="text-muted flex flex-none items-center gap-2 text-sm">
                {theirs >= level && <PartnerMark who={partner.role} />}
                {both ? (
                  <span className="text-ember font-semibold">Open</span>
                ) : on ? (
                  <span>Waiting on {partner.name}</span>
                ) : null}
                {on && (
                  <span className="bg-ember text-on-accent flex h-6 w-6 items-center justify-center rounded-full">
                    <Check size={14} weight="bold" aria-hidden />
                  </span>
                )}
              </span>
            </motion.button>
          );
        })}
      </div>
      <p className="text-faint m-0 text-sm">
        Picking Unhinged confirms you&apos;re 18 or over. Tap your current level again to step down
        one.
      </p>
    </main>
  );
}
