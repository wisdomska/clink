"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCouple } from "@/features/couple/context";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";

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

  const run = async (body: object, done: (d: Awaited<ReturnType<typeof post>>) => void) => {
    try {
      const d = await post(body);
      done(d);
      router.refresh();
    } catch (e) {
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
          <input
            id="ritual"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="mono rounded-input border-line bg-s2 text-text h-10 border px-3 text-sm"
          />
          <Button
            size="sm"
            variant="ghost"
            disabled={!time || time === current || (proposal?.byMe && proposal.time === time)}
            onClick={() =>
              run({ suggest: time }, (d) => {
                if (d.ritualTime) {
                  setCurrent(d.ritualTime);
                  setProposal(null);
                  toast(`Agreed. Ritual at ${d.ritualTime}.`);
                } else {
                  setProposal(d.proposed ?? null);
                  toast(`Suggested. ${partner.name} needs to agree.`);
                }
              })
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
              onClick={() => run({ withdraw: true }, () => setProposal(null))}
            >
              Withdraw
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() =>
                run({ accept: true }, (d) => {
                  setCurrent(d.ritualTime ?? current);
                  setTime(d.ritualTime ?? current);
                  setProposal(null);
                  toast(`Agreed. Ritual at ${d.ritualTime}.`);
                })
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
