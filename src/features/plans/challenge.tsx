"use client";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, Medal } from "@phosphor-icons/react";
import { useCouple } from "@/features/couple/context";
import { Button, IconButton } from "@/components/ui/button";
import { Display, Lead, Mono, PartnerMark } from "@/components/ui/heading";
import { toast } from "@/components/ui/toast";
import { localParts } from "@/lib/time";
import { dayNumber, streak } from "@/lib/challenges";
import { useChallenge } from "./data";

/** DATE-04 challenge tracker: day done, missed, completed badge; or pick one to start. */
export function ChallengeScreen({ id }: { id: string }) {
  const router = useRouter();
  const { me, partner, coupleId } = useCouple();
  const qc = useQueryClient();
  const { data } = useChallenge();
  const c = data?.challenge;
  const showPicker = id === "new" || !c;

  if (showPicker) {
    return (
      <div className="screen an-screen flex max-w-[760px] flex-col gap-5">
        <IconButton label="Back" onClick={() => router.push("/plans")}>
          <ArrowLeft size={20} />
        </IconButton>
        <Display size={48}>
          Pick a <em>challenge</em>
        </Display>
        <Lead>Both of you tick it off each day. Miss one and the streak starts again, no lectures.</Lead>
        <div className="grid gap-3 md:grid-cols-2">
          {(data?.templates ?? []).map((t, i) => (
            <button
              key={t.id}
              type="button"
              className="press an-rise flex cursor-pointer flex-col gap-2 rounded-card border border-line bg-s1 p-4 text-left text-text"
              style={{ ["--i" as string]: i }}
              onClick={async () => {
                const r = await fetch("/api/challenges", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ templateId: t.id }) });
                const d = await r.json();
                if (!r.ok) return toast(d.message);
                await qc.invalidateQueries({ queryKey: ["challenge", coupleId] });
                router.push(`/plans/challenges/${d.id}`);
              }}
            >
              <Mono className="text-muted">{t.days} DAYS</Mono>
              <span className="display text-[22px] tracking-normal">{t.title}</span>
              <span className="text-sm text-muted">{t.blurb}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const tpl = c.challenge_templates as unknown as { title: string; days: number; daily_prompt: string; blurb: string };
  const today = dayNumber(c.start_on, localParts(new Date(), me.timezone).dateKey);
  const by = new Map(data!.days.map((d) => [d.day, d]));
  const mine = (d: number) => (me.role === "a" ? by.get(d)?.done_by_a : by.get(d)?.done_by_b);
  const theirs = (d: number) => (me.role === "a" ? by.get(d)?.done_by_b : by.get(d)?.done_by_a);
  const s = streak(data!.days, today);
  const doneToday = Boolean(mine(today));

  return (
    <div className="screen an-screen flex max-w-[760px] flex-col gap-5">
      <IconButton label="Back" onClick={() => router.push("/plans")}>
        <ArrowLeft size={20} />
      </IconButton>
      <div className="flex items-start justify-between gap-3">
        <div>
          <Mono className="text-muted">{c.status === "completed" ? "COMPLETE" : `DAY ${Math.min(today, tpl.days)} OF ${tpl.days}`}</Mono>
          <Display size={36} className="mt-1">
            {tpl.title}
          </Display>
        </div>
        <div className="text-right">
          <div className="mono text-[48px] leading-none text-accent">{s}</div>
          <div className="mono text-[11px] text-faint">STREAK</div>
        </div>
      </div>
      <p className="display m-0 rounded-card bg-s2 p-4 text-[22px] leading-[1.15] tracking-normal">{tpl.daily_prompt}</p>
      {c.status === "completed" ? (
        <div className="an-reveal flex items-center gap-3 rounded-card border border-accent p-4">
          <Medal size={32} className="text-accent" aria-hidden />
          <div className="text-base font-medium">All {tpl.days} days, both of you. Badge earned.</div>
        </div>
      ) : (
        <Button
          disabled={doneToday}
          onClick={async () => {
            const r = await fetch(`/api/challenges/${c.id}/check`, { method: "POST" });
            const d = await r.json();
            if (!r.ok) return toast(d.message);
            void qc.invalidateQueries({ queryKey: ["challenge", coupleId] });
            toast(theirs(today) ? "Both done today. Streak safe." : `Ticked. Waiting on ${partner.name}.`);
          }}
        >
          {doneToday ? (
            <>
              <Check size={20} aria-hidden /> Done for today
            </>
          ) : (
            "Tick off today"
          )}
        </Button>
      )}
      <div className="grid grid-cols-7 gap-1.5" role="grid" aria-label="Every day">
        {Array.from({ length: tpl.days }, (_, i) => i + 1).map((d) => {
          const missed = d < today && !(mine(d) && theirs(d));
          return (
            <div key={d} role="gridcell" className="flex flex-col items-center gap-1 rounded-input border p-1.5" style={{ borderColor: d === today ? "var(--accent)" : missed ? "var(--line)" : "transparent", opacity: d > today ? 0.4 : 1 }} aria-label={`Day ${d}${missed ? ", missed" : ""}`}>
              <span className="mono text-[11px] text-faint">{d}</span>
              <span className="h-3.5 w-3.5 rounded-full" style={{ background: mine(d) ? "var(--partner-a)" : "transparent", border: `1.5px solid ${mine(d) ? "var(--partner-a)" : "var(--text-faint)"}` }} />
              <span className="h-3.5 w-3.5" style={{ background: theirs(d) ? "var(--partner-b)" : "transparent", border: `1.5px solid ${theirs(d) ? "var(--partner-b)" : "var(--text-faint)"}` }} />
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-4 text-sm text-muted">
        <span className="flex items-center gap-1.5">
          <PartnerMark who="a" /> You
        </span>
        <span className="flex items-center gap-1.5">
          <PartnerMark who="b" /> {partner.name}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
        Badges
        {data!.badges.length ? data!.badges.map((b) => <span key={b} className="rounded-full border border-accent px-2.5 py-1 text-[13px] text-text">{b}</span>) : <span>None yet. First week gets you one.</span>}
      </div>
      <Button variant="text" size="sm" className="self-start text-muted" onClick={() => router.push("/plans/challenges/new")}>
        Swap to a different challenge
      </Button>
    </div>
  );
}
