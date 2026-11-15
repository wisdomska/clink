"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCouple } from "@/features/couple/context";
import { Button } from "@/components/ui/button";
import { PartnerMark } from "@/components/ui/heading";
import { toast } from "@/components/ui/toast";
import type { KnowMeState, TriviaState, WyrState } from "../engines/simultaneous";
import {
  RoomHeader,
  ResultBars,
  ResultMoment,
  sendMove,
  useRevealFeedback,
  type GameRow,
} from "./shared";
import { CountUp } from "@/components/fx/count-up";
import { SwipePick } from "./swipe-pick";
import { startGame } from "../meta";

const fill = (t: string, name: string) => t.replaceAll("{name}", name);

function Option({
  text,
  onClick,
  mine,
  theirs,
  highlight,
  disabled,
}: {
  text: string;
  onClick?: () => void;
  mine?: boolean;
  theirs?: boolean;
  highlight?: "mine" | "theirs" | "both";
  disabled?: boolean;
}) {
  const border =
    highlight === "theirs" || highlight === "both"
      ? "2px solid var(--partner-b)"
      : highlight === "mine"
        ? "2px solid var(--accent)"
        : "1px solid var(--line)";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="press bg-s1 text-text flex min-h-14 cursor-pointer items-center gap-2.5 rounded-full px-[18px] py-3 text-left text-base font-medium disabled:cursor-default"
      style={{ border }}
    >
      <span className="flex-1">{text}</span>
      {mine && <PartnerMark who="a" size={12} />}
      {theirs && <PartnerMark who="b" size={12} />}
    </button>
  );
}

/* PLAY-02 How well do you know me */
export function KnowMeRoom({ game }: { game: GameRow }) {
  const { me, partner } = useCouple();
  const router = useRouter();
  const s = game.state as KnowMeState;
  const iAmSubject = s.subject === me.id;
  const subjectName = iAmSubject ? "you" : partner.name;
  // Show the latest reveal until the player taps Next.
  const [seen, setSeen] = useState(s.reveals.length);
  const [pickAt, setPickAt] = useState<{ index: number; value: number } | null>(null);
  const pick = pickAt?.index === s.index ? pickAt.value : null;
  const showing = seen < s.reveals.length ? seen : null;
  const qIndex = showing ?? s.index;
  const q = s.questions[qIndex]!;
  const reveal = showing !== null ? s.reveals[showing]! : null;
  useRevealFeedback(
    reveal ? `${game.id}:${showing}` : null,
    !!reveal && reveal.answer === reveal.guess,
  );
  const waitingOnThem = showing === null && s.submitted.includes(me.id);

  if (game.status === "finished" && showing === null) {
    return (
      <div className="an-reveal flex flex-1 flex-col">
        <div className="flex flex-1 flex-col justify-center gap-3">
          <ResultMoment gameId={game.id} celebrate={s.score >= 6} />
          <div className="mono text-faint text-xs">ROUND OVER</div>
          <div className="mono text-accent text-[96px] leading-none">
            <CountUp value={s.score} />
            <span className="text-faint">/10</span>
          </div>
          <div className="display text-[28px] leading-[1.05]">
            {iAmSubject ? (
              <>
                {partner.name} knows you{" "}
                {s.score >= 8 ? "suspiciously" : s.score >= 5 ? "pretty" : "a little"}
                {s.score >= 5 ? " well." : "."}
              </>
            ) : (
              <>
                You know {partner.name}{" "}
                {s.score >= 8 ? "suspiciously" : s.score >= 5 ? "pretty" : "a little"}
                {s.score >= 5 ? " well." : "."}
              </>
            )}
          </div>
          <ResultBars type="know_me" current={s.score} />
        </div>
        <div className="flex flex-col gap-2">
          <Button
            onClick={async () => {
              const id = await startGame("know_me", {
                subject: s.guesser === me.id ? "me" : "partner",
              }).catch((e: Error) => toast.err(e.message));
              if (id) router.push(`/play/know_me/${id}`);
            }}
          >
            Rematch, {s.guesser === me.id ? partner.name : "you"} guess
            {s.guesser === me.id ? "es" : ""}
          </Button>
          <Button variant="ghost" size="lg" onClick={() => router.push("/play")}>
            Back to the lobby
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <RoomHeader
        type="know_me"
        live={game.status === "active"}
        counter={`${String(qIndex + 1).padStart(2, "0")}/10`}
        progress={(qIndex + (reveal ? 1 : 0)) / 10}
      />
      <div className="text-muted flex flex-wrap gap-4 text-sm font-medium">
        <span className="flex items-center gap-1.5">
          <PartnerMark who="a" />
          {iAmSubject ? "You answer about yourself" : "You guess"}
        </span>
        <span className="flex items-center gap-1.5">
          <PartnerMark who="b" />
          {iAmSubject ? `${partner.name} guesses` : `${partner.name} answers honestly`}
        </span>
      </div>
      <h2 className="display mt-3 mb-2 text-[36px] leading-[1.05]">
        {fill(q.text, iAmSubject ? me.name : partner.name)}
      </h2>
      <div className="flex flex-col gap-2">
        {q.options.map((o, i) => {
          const theirsMark = reveal ? reveal.answer === i : false;
          const mineMark = reveal ? reveal.guess === i : false;
          return (
            <Option
              key={i}
              text={o}
              disabled={Boolean(reveal) || waitingOnThem}
              mine={Boolean(reveal) && (iAmSubject ? reveal!.answer === i : mineMark)}
              theirs={Boolean(reveal) && (iAmSubject ? mineMark : theirsMark)}
              highlight={
                reveal
                  ? theirsMark
                    ? "theirs"
                    : mineMark
                      ? "mine"
                      : undefined
                  : pick === i
                    ? "mine"
                    : undefined
              }
              onClick={async () => {
                setPickAt({ index: s.index, value: i });
                await sendMove(game.id, { pick: i });
              }}
            />
          );
        })}
      </div>
      {waitingOnThem && (
        <div className="an-reveal text-muted text-sm">Locked in. Waiting on {partner.name}.</div>
      )}
      {reveal && (
        <div className="an-reveal rounded-card bg-s2 flex items-center justify-between gap-3 p-4">
          <div>
            <div className="display text-[22px] tracking-normal">
              {reveal.answer === reveal.guess
                ? "Got it."
                : `Close. It was ${q.options[reveal.answer]}.`}
            </div>
            <div className="text-muted text-sm">
              {reveal.answer === reveal.guess
                ? `${subjectName === "you" ? "They" : "You"} really know ${subjectName === "you" ? "you" : "them"}.`
                : "Noted for next time."}
            </div>
          </div>
          <Button size="md" className="flex-none" onClick={() => setSeen((n) => n + 1)}>
            Next
          </Button>
        </div>
      )}
    </>
  );
}

/* PLAY-04 Trivia duel */
export function TriviaRoom({ game }: { game: GameRow }) {
  const { me, partner } = useCouple();
  const router = useRouter();
  const s = game.state as TriviaState;
  const [seen, setSeen] = useState(s.reveals.length);
  const showing = seen < s.reveals.length ? seen : null;
  const qIndex = showing ?? s.index;
  const q = s.questions[qIndex]!;
  const reveal = showing !== null ? s.reveals[showing]! : null;
  useRevealFeedback(
    reveal ? `${game.id}:${showing}` : null,
    !!reveal && reveal.picks[me.id] === reveal.correct,
  );
  const waiting = showing === null && s.submitted.includes(me.id);
  const my = s.scores[me.id] ?? 0;
  const their = s.scores[partner.id] ?? 0;

  if (game.status === "finished" && showing === null) {
    return (
      <div className="an-reveal flex flex-1 flex-col">
        <div className="flex flex-1 flex-col justify-center gap-3">
          <ResultMoment gameId={game.id} celebrate={my >= their} />
          <div className="mono text-faint text-xs">DUEL OVER</div>
          <div className="mono text-[72px] leading-none">
            <CountUp value={my} className="text-accent" />
            <span className="text-faint"> : </span>
            <span style={{ color: "var(--partner-b)" }}>
              <CountUp value={their} />
            </span>
          </div>
          <div className="display text-[28px] leading-[1.05]">
            {my === their ? (
              <>A draw. Rematch?</>
            ) : my > their ? (
              <>You win this one.</>
            ) : (
              <>{partner.name} wins. For now.</>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Button
            onClick={async () => {
              const id = await startGame("trivia").catch(() => null);
              if (id) router.push(`/play/trivia/${id}`);
            }}
          >
            Rematch
          </Button>
          <Button variant="ghost" size="lg" onClick={() => router.push("/play")}>
            Back to the lobby
          </Button>
        </div>
      </div>
    );
  }
  return (
    <>
      <RoomHeader
        type="trivia"
        live={game.status === "active"}
        counter={`${String(qIndex + 1).padStart(2, "0")}/10`}
        progress={(qIndex + (reveal ? 1 : 0)) / 10}
      />
      <div className="text-muted flex items-center justify-between text-sm font-medium">
        <span className="border-line rounded-full border px-3 py-1 text-xs">{q.category}</span>
        <span className="mono">
          you {my} · {partner.name} {their}
        </span>
      </div>
      <h2 className="display mt-3 mb-2 text-[30px] leading-[1.1]">{q.text}</h2>
      <div className="flex flex-col gap-2">
        {q.options.map((o, i) => (
          <Option
            key={i}
            text={o}
            disabled={Boolean(reveal) || waiting}
            mine={Boolean(reveal) && reveal!.picks[me.id] === i}
            theirs={Boolean(reveal) && reveal!.picks[partner.id] === i}
            highlight={reveal ? (reveal.correct === i ? "both" : undefined) : undefined}
            onClick={() => sendMove(game.id, { pick: i })}
          />
        ))}
      </div>
      {waiting && <div className="text-muted text-sm">Locked in. Waiting on {partner.name}.</div>}
      {reveal && (
        <div className="an-reveal rounded-card bg-s2 flex items-center justify-between gap-3 p-4">
          <div className="display text-[22px] tracking-normal">
            {reveal.picks[me.id] === reveal.correct
              ? reveal.picks[partner.id] === reveal.correct
                ? "You both got it."
                : "You got it."
              : reveal.picks[partner.id] === reveal.correct
                ? `${partner.name} got it.`
                : "Neither of you. Ouch."}
          </div>
          <Button size="md" className="flex-none" onClick={() => setSeen((n) => n + 1)}>
            Next
          </Button>
        </div>
      )}
    </>
  );
}

/* PLAY-05 Would you rather / This or that */
export function WyrRoom({ game }: { game: GameRow }) {
  const { me, partner } = useCouple();
  const router = useRouter();
  const s = game.state as WyrState;
  const [seen, setSeen] = useState(s.reveals.length);
  const showing = seen < s.reveals.length ? seen : null;
  const idx = showing ?? s.index;
  const card = s.cards[idx]!;
  const reveal = showing !== null ? s.reveals[showing]! : null;
  useRevealFeedback(
    reveal ? `${game.id}:${showing}` : null,
    !!reveal && reveal[me.id] === reveal[partner.id],
  );
  const waiting = showing === null && s.submitted.includes(me.id);

  if (game.status === "finished" && showing === null) {
    return (
      <div className="an-reveal flex flex-1 flex-col">
        <div className="flex flex-1 flex-col justify-center gap-3">
          <ResultMoment gameId={game.id} celebrate={s.matches >= s.cards.length * 0.6} />
          <div className="mono text-faint text-xs">{s.deck.toUpperCase()} DECK</div>
          <div className="mono text-accent text-[96px] leading-none">
            <CountUp value={s.matches} />
            <span className="text-faint">/{s.cards.length}</span>
          </div>
          <div className="display text-[28px] leading-[1.05]">
            {s.matches >= s.cards.length * 0.7 ? (
              <>Same brain, two cities.</>
            ) : s.matches >= s.cards.length * 0.4 ? (
              <>Enough in common. Enough to argue about.</>
            ) : (
              <>Opposites. Fun.</>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Button onClick={() => router.push("/play")}>Another deck</Button>
        </div>
      </div>
    );
  }
  return (
    <>
      <RoomHeader
        type="wyr"
        live={game.status === "active"}
        counter={`${String(idx + 1).padStart(2, "0")}/${s.cards.length}`}
        progress={(idx + (reveal ? 1 : 0)) / s.cards.length}
      />
      <h2 className="display mt-3 text-[30px] leading-[1.1]">Would you rather</h2>
      {!reveal && !waiting && (
        <div className="md:hidden">
          <SwipePick
            key={idx}
            a={card.a}
            b={card.b}
            onPick={(k) => void sendMove(game.id, { pick: k })}
          />
        </div>
      )}
      <div className="grid gap-2.5 sm:grid-cols-2">
        {(["a", "b"] as const).map((k) => {
          const mine = reveal?.[me.id] === k;
          const theirs = reveal?.[partner.id] === k;
          return (
            <button
              key={k}
              type="button"
              disabled={Boolean(reveal) || waiting}
              onClick={() => sendMove(game.id, { pick: k })}
              className="press rounded-card bg-s1 text-text flex min-h-[120px] cursor-pointer flex-col justify-between gap-3 p-4 text-left disabled:cursor-default"
              style={{
                border:
                  mine && theirs
                    ? "2px solid var(--accent)"
                    : theirs
                      ? "2px solid var(--partner-b)"
                      : mine
                        ? "2px solid var(--accent)"
                        : "1px solid var(--line)",
              }}
            >
              <span className="display text-[22px] leading-[1.15] tracking-normal">
                {k === "a" ? card.a : card.b}
              </span>
              <span className="flex gap-2">
                {mine && <PartnerMark who="a" size={12} />}
                {theirs && <PartnerMark who="b" size={12} />}
              </span>
            </button>
          );
        })}
      </div>
      {waiting && <div className="text-muted text-sm">Picked. Waiting on {partner.name}.</div>}
      {reveal && (
        <div className="an-reveal rounded-card bg-s2 flex items-center justify-between gap-3 p-4">
          <div className="display text-[22px] tracking-normal">
            {reveal[me.id] === reveal[partner.id] ? "A match." : "Agree to disagree."}
          </div>
          <Button size="md" onClick={() => setSeen((n) => n + 1)}>
            Next
          </Button>
        </div>
      )}
    </>
  );
}
