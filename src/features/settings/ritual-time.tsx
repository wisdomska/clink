"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCouple } from "@/features/couple/context";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { TimeField } from "@/components/ui/pickers";

async function post(body: object) {
  const r = await fetch("/api/couple/ritual-time", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.message ?? "Couldn't save that.");
  return d as { ritualTime?: string; proposed?: { time: string; byMe: boolean } | null };
}

/** HOME-08: the daily ritual time, set only when both of you agree. */
export function RitualTimeRows() {
  const { ritualTime, ritualProposal, partner } = useCouple();
  const router = useRouter();
  const [time, setTime] = useState(ritualTime);
  const [proposal, setProposal] = useState(ritualProposal);
  const [current, setCurrent] = useState(ritualTime);

  /**
   * Optimistic: `guess` updates the rows straight away, `done` reconciles with
   * what the server decided, and a failure puts the rows back as they were.
   */
  const run = async (
    body: object,
    guess: () => void,
    done: (d: Awaited<ReturnType<typeof post>>) => void,
  ) => {
    const before = { proposal, current, time };
    guess();
    try {
      const d = await post(body);
      done(d);
      router.refresh();
    } catch (e) {
      setProposal(before.proposal);
      setCurrent(before.current);
      setTime(before.time);
      toast.err(e instanceof Error ? e.message : "Couldn't save that.");
    }
  };

  return (
    <>
      <div className="border-line flex min-h-14 items-center justify-between gap-3 border-b px-4 py-2.5">
        <label htmlFor="ritual" className="text-base font-medium">
          Ritual time
          <span className="text-faint block text-[13px] font-normal">
            Set when you both agree. Now {current}.
          </span>
        </label>
        <div className="flex items-center gap-2">
          <TimeField id="ritual" value={time} onChange={setTime} size="sm" className="w-[120px]" />
          <Button
            size="sm"
            variant="ghost"
            disabled={!time || time === current || (proposal?.byMe && proposal.time === time)}
            onClick={() =>
              run(
                { suggest: time },
                () => {
                  // Suggesting the time they already proposed agrees to it.
                  if (proposal && !proposal.byMe && proposal.time === time) {
                    setCurrent(time);
                    setProposal(null);
                  } else setProposal({ time, byMe: true });
                },
                (d) => {
                  if (d.ritualTime) {
                    setCurrent(d.ritualTime);
                    setProposal(null);
                    toast(`Agreed. Ritual at ${d.ritualTime}.`);
                  } else {
                    setProposal(d.proposed ?? null);
                    toast(`Suggested. ${partner.name} needs to agree.`);
                  }
                },
              )
            }
          >
            Suggest
          </Button>
        </div>
      </div>
      {proposal && (
        <div className="border-line flex min-h-14 items-center justify-between gap-3 border-b px-4 py-2.5">
          <span className="text-base">
            {proposal.byMe
              ? `You suggested ${proposal.time}. Waiting for ${partner.name}.`
              : `${partner.name} suggested ${proposal.time}.`}
          </span>
          {proposal.byMe ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                run(
                  { withdraw: true },
                  () => setProposal(null),
                  () => undefined,
                )
              }
            >
              Withdraw
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() =>
                run(
                  { accept: true },
                  () => {
                    setCurrent(proposal.time);
                    setTime(proposal.time);
                    setProposal(null);
                  },
                  (d) => {
                    if (d.ritualTime) {
                      setCurrent(d.ritualTime);
                      setTime(d.ritualTime);
                    }
                    toast(`Agreed. Ritual at ${d.ritualTime}.`);
                  },
                )
              }
            >
              Agree
            </Button>
          )}
        </div>
      )}
    </>
  );
}
