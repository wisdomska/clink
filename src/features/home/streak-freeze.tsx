"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCouple } from "@/features/couple/context";
import { supabaseBrowser } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { toast } from "@/components/ui/toast";

interface Status {
  left: number;
  streak: number;
  broken: boolean;
  repaired: number;
  today_frozen: boolean;
  today_done: boolean;
}

function useFreeze() {
  const { coupleId } = useCouple();
  return useQuery({
    queryKey: ["streak-freeze", coupleId],
    queryFn: async () =>
      ((await supabaseBrowser().rpc("streak_freeze_status")).data ?? null) as Status | null,
    staleTime: 60_000,
  });
}

async function spendFreeze(day: "today" | "yesterday") {
  const r = await fetch("/api/streak/freeze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ day }),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.message ?? "That didn't work.");
}

const left = (n: number) => `${n} ${n === 1 ? "freeze" : "freezes"} left this month`;

/**
 * When yesterday broke the streak and a freeze would keep it: a card on Us
 * offering to. Either of you can; your partner hears about it.
 */
export function StreakRepair() {
  const qc = useQueryClient();
  const { partner } = useCouple();
  const { data } = useFreeze();
  const [busy, setBusy] = useState(false);
  if (!data?.broken || data.left === 0) return null;
  return (
    <section
      aria-labelledby="freeze-h"
      className="an-pop rounded-card border-line bg-s1 flex items-center gap-3 border p-4"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/art/freeze.webp"
        alt=""
        aria-hidden
        className="h-12 w-12 flex-none object-contain"
      />
      <div className="min-w-0 flex-1">
        <h2 id="freeze-h" className="m-0 text-base font-bold">
          Your {data.repaired}-day streak slipped yesterday
        </h2>
        <p className="text-muted m-0 text-sm">
          Use a freeze to keep it. {left(data.left)}, shared with {partner.name}.
        </p>
      </div>
      <Button
        size="sm"
        loading={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await spendFreeze("yesterday");
            toast.ok(`Saved. ${data.repaired} days and counting.`);
            await Promise.all([
              qc.invalidateQueries({ queryKey: ["streak-freeze"] }),
              qc.invalidateQueries({ queryKey: ["streak"] }),
            ]);
          } catch (e) {
            toast.err(e instanceof Error ? e.message : "That didn't work.");
          } finally {
            setBusy(false);
          }
        }}
      >
        Use a freeze
      </Button>
    </section>
  );
}

/** Under the streak: plan a day off. Only while there's a streak to protect and today isn't done. */
export function FreezeToday() {
  const qc = useQueryClient();
  const { partner } = useCouple();
  const { data } = useFreeze();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!data || data.streak === 0 || data.today_done) return null;
  if (data.today_frozen)
    return (
      <p className="text-muted m-0 text-center text-sm">Today is frozen: your streak is safe.</p>
    );
  if (data.left === 0) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-muted hover:text-text min-h-11 cursor-pointer self-center border-0 bg-transparent text-sm underline-offset-4 hover:underline"
      >
        Can&apos;t clink today? Freeze the streak
      </button>
      <Sheet open={open} onOpenChange={setOpen} title="Freeze today" handle>
        <div className="flex flex-col gap-4 pb-2">
          <p className="text-muted m-0 text-base">
            A long flight, an exam, no signal: freeze today and your {data.streak}-day streak waits
            for you. It won&apos;t add a day, it just keeps it. {left(data.left)}, shared with{" "}
            {partner.name}, who&apos;ll get a note.
          </p>
          <Button
            loading={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await spendFreeze("today");
                toast.ok("Today is frozen.");
                setOpen(false);
                await qc.invalidateQueries({ queryKey: ["streak-freeze"] });
              } catch (e) {
                toast.err(e instanceof Error ? e.message : "That didn't work.");
              } finally {
                setBusy(false);
              }
            }}
          >
            Freeze today
          </Button>
        </div>
      </Sheet>
    </>
  );
}
