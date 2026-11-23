"use client";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowUUpLeft, ShareNetwork } from "@phosphor-icons/react";
import { useCouple, useCoupleNow } from "@/features/couple/context";
import { PageBar } from "@/components/clink/page-bar";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { cn } from "@/components/ui/cn";
import { feedback, haptic } from "@/lib/feedback";
import { localParts } from "@/lib/time";
import { oneApart, parLine, MAX_STEPS } from "@/lib/ladder";
import { ShareCardSheet } from "@/components/clink/share-card";

interface Result {
  path: string[];
  steps: number;
  seconds: number;
  hints?: number;
}
interface Ladder {
  day: string;
  start: string;
  target: string;
  par: number;
  mine: Result | null;
  theirs: { done: boolean } & Partial<Result>;
}

const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
const startKey = (day: string) => `clink.ladder.start.${day}`;

/** The couple's day, on partner A's calendar (as the daily ritual). */
export function useLadderDay() {
  const { me, partner } = useCouple();
  const anchor = me.role === "a" ? me : partner;
  return localParts(new Date(), anchor.timezone).dateKey;
}

export function useLadder(day: string) {
  return useQuery({
    queryKey: ["ladder", day],
    queryFn: async () => {
      const r = await fetch(`/api/ladder?day=${day}`, { cache: "no-store" });
      if (!r.ok) throw new Error("Couldn't load today's ladder.");
      return (await r.json()) as Ladder;
    },
  });
}

/**
 * The daily ladder: turn today's start word into the target, one letter at a
 * time, every step a real word. The same puzzle for you both; your partner's
 * ladder shows once you've finished yours.
 */
export function LadderScreen() {
  const day = useLadderDay();
  const { partner } = useCouple();
  const { data, isLoading } = useLadder(day);
  return (
    <div className="screen an-screen mx-auto flex w-full max-w-[560px] flex-col gap-5">
      <PageBar title="Daily ladder" back="/play" />
      {isLoading || !data ? (
        <div className="an-skel rounded-card bg-s2 h-80" aria-hidden />
      ) : data.mine ? (
        <Finished data={data} />
      ) : (
        <Climb data={data} partnerName={partner.name} />
      )}
    </div>
  );
}

function Rung({ word, tone }: { word: string; tone?: "start" | "target" | "step" | "ghost" }) {
  return (
    <div
      className={cn(
        "mono flex h-12 items-center justify-center gap-2 rounded-full border text-xl tracking-[.3em] uppercase",
        tone === "start" && "border-accent/60 bg-accent/10",
        tone === "target" && "border-[var(--champagne)]/60 text-[var(--champagne)]",
        tone === "step" && "border-line bg-s1",
        tone === "ghost" && "border-line text-faint border-dashed",
      )}
    >
      {word}
    </div>
  );
}

function Climb({ data, partnerName }: { data: Ladder; partnerName: string }) {
  const qc = useQueryClient();
  const [path, setPath] = useState<string[]>([data.start]);
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState(false);
  const [hints, setHints] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const last = path[path.length - 1]!;
  const now = useCoupleNow(1000);
  // The clock starts the first time you open today's ladder, even across reloads.
  const [startedAt] = useState(() => {
    try {
      const saved = Number(localStorage.getItem(startKey(data.day)));
      if (saved) return saved;
      const t = Date.now();
      localStorage.setItem(startKey(data.day), String(t));
      return t;
    } catch {
      return Date.now();
    }
  });
  const elapsed = Math.max(0, Math.round((now.getTime() - startedAt) / 1000));

  async function finish(full: string[]) {
    setBusy(true);
    const r = await fetch("/api/ladder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        day: data.day,
        path: full,
        seconds: Math.round((Date.now() - startedAt) / 1000),
        hints,
      }),
    });
    const d = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) return toast.err(d.message ?? "That didn't go in.");
    feedback("success", "win");
    await qc.invalidateQueries({ queryKey: ["ladder", data.day] });
  }

  async function step(e: React.FormEvent) {
    e.preventDefault();
    const w = next.trim().toLowerCase();
    if (!/^[a-z]{4}$/.test(w)) return toast.err("Four letters.");
    if (!oneApart(last, w)) {
      haptic("error");
      return toast.err("Change exactly one letter.");
    }
    if (path.includes(w)) return toast.err("You've been there already.");
    if (path.length > MAX_STEPS) return toast.err("That's a long way round. Undo a step or two.");
    setBusy(true);
    const r = await fetch(`/api/ladder/word?w=${w}`)
      .then((x) => x.json())
      .catch(() => null);
    setBusy(false);
    if (!r?.word) {
      haptic("error");
      return toast.err(`${w.toUpperCase()} isn't in the dictionary.`);
    }
    haptic("tap");
    const full = [...path, w];
    setPath(full);
    setNext("");
    if (w === data.target) await finish(full);
    else input.current?.focus();
  }

  return (
    <>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-muted m-0 text-base">
          Turn <b className="text-text">{data.start.toUpperCase()}</b> into{" "}
          <b className="text-text">{data.target.toUpperCase()}</b>, one letter at a time. Par is{" "}
          {data.par}.
        </p>
        <span className="mono text-muted flex-none text-sm" aria-label="Time">
          {clock(elapsed)}
        </span>
      </div>
      {data.theirs.done && (
        <p className="text-muted m-0 text-sm" role="status">
          {partnerName} has finished. Climb yours to see how they did.
        </p>
      )}
      <ol className="m-0 flex list-none flex-col gap-2 p-0" aria-label="Your ladder">
        {path.map((w, i) => (
          <li key={i}>
            <Rung word={w} tone={i === 0 ? "start" : "step"} />
          </li>
        ))}
      </ol>
      <form onSubmit={step} className="flex gap-2">
        <input
          ref={input}
          aria-label="Next word"
          value={next}
          onChange={(e) => setNext(e.target.value.replace(/[^a-z]/gi, "").slice(0, 4))}
          placeholder={last.toUpperCase()}
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          className="mono rounded-input border-line bg-s2 text-text focus:border-accent h-[52px] min-w-0 flex-1 border px-4 text-center text-xl tracking-[.3em] uppercase outline-none"
        />
        <Button type="submit" loading={busy} disabled={next.length !== 4}>
          Step
        </Button>
      </form>
      <div className="flex items-center justify-between gap-2">
        <Button
          variant="ghost"
          size="sm"
          disabled={path.length < 2 || busy}
          onClick={() => setPath((p) => p.slice(0, -1))}
        >
          <ArrowUUpLeft size={16} aria-hidden /> Undo a step
        </Button>
        <Button
          variant="text"
          size="sm"
          disabled={busy}
          onClick={async () => {
            const r = await fetch(`/api/ladder/hint?day=${data.day}&from=${last}`)
              .then((x) => x.json())
              .catch(() => null);
            if (!r?.next)
              return toast(`There's no everyday route on from ${last.toUpperCase()}. Undo a step.`);
            setHints((n) => n + 1);
            setNext(r.next);
            input.current?.focus();
          }}
        >
          Show me a step
        </Button>
      </div>
      <Rung word={data.target} tone="target" />
      <p className="text-faint m-0 text-center text-sm">
        {path.length - 1} {path.length === 2 ? "step" : "steps"} so far
        {hints ? ` · ${hints} ${hints === 1 ? "hint" : "hints"}` : ""}
      </p>
    </>
  );
}

function Finished({ data }: { data: Ladder }) {
  const { me, partner } = useCouple();
  const [sharing, setSharing] = useState(false);
  const mine = data.mine!;
  const theirs = data.theirs.path ? (data.theirs as Result) : null;
  useEffect(() => {
    try {
      localStorage.removeItem(startKey(data.day));
    } catch {
      /* fine */
    }
  }, [data.day]);
  const column = (who: string, r: Result | null) => (
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      <div className="text-muted text-sm font-semibold">{who}</div>
      {r ? (
        <>
          <ol className="m-0 flex list-none flex-col gap-1.5 p-0" aria-label={`${who}'s ladder`}>
            {r.path.map((w, i) => (
              <li
                key={i}
                className={cn(
                  "mono rounded-full border py-1.5 text-center tracking-[.25em] uppercase",
                  i === 0 || i === r.path.length - 1 ? "border-accent/50" : "border-line",
                )}
              >
                {w}
              </li>
            ))}
          </ol>
          <div className="text-sm">
            <span className="mono">{r.steps}</span> steps ·{" "}
            <span className="mono">{clock(r.seconds)}</span>
            {r.hints ? ` · ${r.hints} ${r.hints === 1 ? "hint" : "hints"}` : ""}
          </div>
        </>
      ) : (
        <p className="text-muted m-0 text-sm">Not yet. We&apos;ll let them know.</p>
      )}
    </div>
  );
  return (
    <>
      <div className="flex flex-col gap-1" role="status">
        <div className="display text-[32px] leading-tight">{parLine(mine.steps, data.par)}</div>
        <div className="text-muted text-base">
          {mine.steps} steps in {clock(mine.seconds)}
          {mine.hints ? `, with ${mine.hints} ${mine.hints === 1 ? "hint" : "hints"}` : ""}. Par was{" "}
          {data.par}.
          {theirs &&
            (theirs.steps === mine.steps
              ? " Level with " + partner.name + "."
              : theirs.steps > mine.steps
                ? ` ${theirs.steps - mine.steps} fewer than ${partner.name}.`
                : ` ${partner.name} did it in ${theirs.steps}.`)}
        </div>
      </div>
      <div className="flex gap-4">
        {column("You", mine)}
        {column(partner.name, theirs)}
      </div>
      <Button variant="ghost" className="self-start" onClick={() => setSharing(true)}>
        <ShareNetwork size={18} aria-hidden /> Share (no spoilers)
      </Button>
      <ShareCardSheet
        open={sharing}
        onOpenChange={setSharing}
        filename={`clink-ladder-${data.day}.png`}
        content={(named) => ({
          art: "puzzle",
          kicker: `Daily ladder · ${data.day}`,
          headline: named
            ? `${me.name}: ${parLine(mine.steps, data.par)}`
            : parLine(mine.steps, data.par),
          big: `${mine.steps} steps`,
          sub: `Par ${data.par} · ${clock(mine.seconds)}${mine.hints ? ` · ${mine.hints} ${mine.hints === 1 ? "hint" : "hints"}` : ""}${theirs ? ` · ${named ? partner.name : "them"} ${theirs.steps}` : ""}`,
        })}
      />
    </>
  );
}
