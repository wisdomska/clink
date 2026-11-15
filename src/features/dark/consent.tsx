"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "@phosphor-icons/react";
import { useCouple } from "@/features/couple/context";
import { Button, IconButton } from "@/components/ui/button";
import { Display, Lead, PartnerMark } from "@/components/ui/heading";
import { toast } from "@/components/ui/toast";
import { TIERS, contiguousRank } from "@/lib/dark-logic";
import { useDarkState, darkFetch } from "./api";
import { VerifySheet } from "./hub";

/** /dark/consent: tier opt-in (either partner can lower any time), plus age verification. */
export function Consent() {
  const router = useRouter();
  const qc = useQueryClient();
  const { partner } = useCouple();
  const { data: s } = useDarkState();
  const [draft, setTiers] = useState<string[] | null>(null);
  const tiers = draft ?? s?.me.tiers ?? [];
  const [verifyOpen, setVerifyOpen] = useState(false);
  const theirs = contiguousRank(s?.partner.tiers ?? []);
  return (
    <main className="an-screen mx-auto flex min-h-dvh max-w-[560px] flex-col gap-5 px-5 pt-[calc(env(safe-area-inset-top)+12px)] pb-10 md:pt-10">
      <IconButton label="Back" onClick={() => router.push("/dark/home")}>
        <ArrowLeft size={20} />
      </IconButton>
      <Display size={36}>
        Your <em>tiers</em>
      </Display>
      <Lead>
        A tier opens only when you both pick it. Lowering takes effect straight away and{" "}
        {partner.name} sees only &quot;After Dark settings changed&quot;.
      </Lead>
      <div className="flex flex-col gap-2">
        {TIERS.map((t, i) => {
          const on = contiguousRank(tiers) > i;
          const unhingedLocked = t === "Unhinged" && !s?.me.verified;
          return (
            <button
              key={t}
              type="button"
              aria-pressed={on}
              onClick={() =>
                unhingedLocked
                  ? setVerifyOpen(true)
                  : setTiers(on ? TIERS.slice(0, i) : TIERS.slice(0, i + 1))
              }
              className="press rounded-card bg-s2 text-text flex min-h-16 cursor-pointer items-center justify-between gap-3 px-[18px] text-left"
              style={{ border: on ? "2px solid var(--accent-dark)" : "1px solid var(--line)" }}
            >
              <span className="display text-[24px] tracking-normal">{t}</span>
              <span className="text-muted flex items-center gap-2 text-sm">
                {theirs > i && (
                  <>
                    <PartnerMark who={partner.role} /> {partner.name}
                  </>
                )}
                {unhingedLocked ? "Verify first" : on ? "You: yes" : "You: not yet"}
              </span>
            </button>
          );
        })}
      </div>
      <Button
        onClick={async () => {
          try {
            await darkFetch("/api/dark/consent", { tiers: TIERS.slice(0, contiguousRank(tiers)) });
            await qc.invalidateQueries({ queryKey: ["dark-state"] });
            toast("After Dark settings changed.");
            router.push("/dark/home");
          } catch (e) {
            toast.err(e instanceof Error ? e.message : "Couldn't save.");
          }
        }}
      >
        Save
      </Button>
      <VerifySheet
        open={verifyOpen}
        onOpenChange={(v) => {
          setVerifyOpen(v);
          if (!v) void qc.invalidateQueries({ queryKey: ["dark-state"] });
        }}
        meVerified={Boolean(s?.me.verified)}
        partnerVerified={Boolean(s?.partner.verified)}
      />
    </main>
  );
}
