"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Camera, Check, Hourglass, ImageSquare } from "@phosphor-icons/react";
import { useCouple } from "@/features/couple/context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { CountUp } from "@/components/fx/count-up";
import { LoadingDots } from "@/components/ui/spinner";
import { feedback } from "@/lib/feedback";
import { cn } from "@/components/ui/cn";
import { compressImage } from "@/lib/media/compress";
import { uploadMedia } from "@/lib/media/upload";
import { avatarSrc } from "@/lib/avatars";
import type { GameType } from "../engines/types";
import {
  RPS_TARGET,
  ZOOM_LEVELS,
  type MemoryState,
  type RpsState,
  type SnapState,
  type Throw,
  type ZoomState,
} from "../engines/image";
import { RoomHeader, ResultMoment, sendMove, type GameRow } from "./shared";
import { startGame } from "../meta";

const view = (id: string) => `/api/media/${id}/view`;

/* ----------------------------------------------------------- shared bits */

function Scoreline({ mine, theirs, label }: { mine: number; theirs: number; label?: string }) {
  const { partner } = useCouple();
  return (
    <div className="text-muted flex items-center justify-between text-sm font-medium">
      <span className="mono text-xs tracking-wide">{label}</span>
      <span className="mono">
        you <span className="text-accent">{mine}</span> · {partner.name.toLowerCase()}{" "}
        <span style={{ color: "var(--partner-b)" }}>{theirs}</span>
      </span>
    </div>
  );
}

function WaitingOn({ text }: { text: string }) {
  return (
    <div
      className="text-muted flex items-center justify-center gap-2 py-3 text-sm font-medium"
      role="status"
    >
      <LoadingDots className="text-accent" />
      {text}
    </div>
  );
}

function GameOver({ game, type }: { game: GameRow; type: GameType }) {
  const { me, partner } = useCouple();
  const router = useRouter();
  const scores = (game.state as { scores: Record<string, number> }).scores;
  const my = scores[me.id] ?? 0;
  const their = scores[partner.id] ?? 0;
  return (
    <div className="an-reveal flex flex-1 flex-col">
      <div className="flex flex-1 flex-col justify-center gap-3">
        <ResultMoment gameId={game.id} celebrate={my >= their} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/art/trophy.webp" alt="" aria-hidden className="h-20 w-20 object-contain" />
        <div className="mono text-[72px] leading-none">
          <CountUp value={my} className="text-accent" />
          <span className="text-faint"> : </span>
          <span style={{ color: "var(--partner-b)" }}>
            <CountUp value={their} />
          </span>
        </div>
        <div className="display text-[28px] leading-[1.05]">
          {my === their ? (
            <>
              A <em>draw</em>. Rematch?
            </>
          ) : my > their ? (
            <>
              You <em>win</em> this one.
            </>
          ) : (
            <>
              {partner.name} <em>wins</em>. For now.
            </>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Button
          onClick={async () => {
            const id = await startGame(type).catch(() => null);
            if (id) router.push(`/play/${type}/${id}`);
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

/** Take or pick a photo, compress it, upload it; returns the media id. */
function usePhotoUpload() {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const upload = async (file: File) => {
    setBusy(true);
    setProgress(0);
    try {
      const img = await compressImage(file);
      const r = await uploadMedia(
        img.blob,
        { kind: "image", width: img.width, height: img.height },
        setProgress,
      );
      return r.id;
    } finally {
      setBusy(false);
    }
  };
  return { busy, progress, upload };
}

/* ---------------------------------------------------- rock paper scissors */

const THROWS: Array<{ key: Throw; label: string }> = [
  { key: "rock", label: "Rock" },
  { key: "paper", label: "Paper" },
  { key: "scissors", label: "Scissors" },
];

export function RpsRoom({ game }: { game: GameRow }) {
  const { me, partner } = useCouple();
  const s = game.state as RpsState;
  const [pending, setPending] = useState<Throw | null>(null);
  const [seen, setSeen] = useState(s.rounds.length);
  const last = s.rounds.at(-1);
  const revealing = seen < s.rounds.length ? last : null;
  const thrown = s.submitted.includes(me.id);

  useEffect(() => {
    if (!revealing) return;
    const won = revealing.winner === me.id;
    feedback(won ? "success" : revealing.winner ? "error" : "tap", won ? "win" : "pop");
    const t = setTimeout(() => setSeen(s.rounds.length), 1900);
    return () => clearTimeout(t);
  }, [revealing, s.rounds.length, me.id]);

  if (game.status === "finished" && !revealing) return <GameOver game={game} type="rps" />;

  return (
    <>
      <RoomHeader
        type="rps"
        live={game.status === "active"}
        counter={`ROUND ${s.rounds.length + (revealing ? 0 : 1)}`}
        progress={Math.max(s.scores[me.id] ?? 0, s.scores[partner.id] ?? 0) / RPS_TARGET}
      />
      <Scoreline
        mine={s.scores[me.id] ?? 0}
        theirs={s.scores[partner.id] ?? 0}
        label={`FIRST TO ${RPS_TARGET}`}
      />
      <div className="relative flex min-h-[260px] flex-1 items-center justify-center gap-6">
        <AnimatePresence mode="wait">
          {revealing ? (
            <motion.div
              key={`r${s.rounds.length}`}
              className="flex items-center gap-6"
              initial={{ opacity: 0.01 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {[me.id, partner.id].map((who, i) => (
                <motion.div
                  key={who}
                  className="flex flex-col items-center gap-2"
                  initial={{ y: -30, rotate: i ? 20 : -20 }}
                  animate={{
                    y: [-30, 0, -18, 0, -10, 0],
                    rotate: 0,
                    scale: revealing.winner === who ? 1.15 : revealing.winner ? 0.85 : 1,
                  }}
                  transition={{ duration: 0.9 }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/art/${revealing.picks[who]}.webp`}
                    alt={revealing.picks[who]}
                    className={cn("h-28 w-28 object-contain", i === 1 && "-scale-x-100")}
                  />
                  <span className="text-sm font-bold">{who === me.id ? "You" : partner.name}</span>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="pick"
              className="flex flex-col items-center gap-3 text-center"
              initial={{ opacity: 0.01, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="display text-[30px] leading-[1.1]">
                {thrown ? (
                  <>
                    Locked <em>in</em>.
                  </>
                ) : (
                  <>
                    Rock, paper, <em>scissors</em>...
                  </>
                )}
              </div>
              {thrown && <WaitingOn text={`Waiting on ${partner.name}`} />}
            </motion.div>
          )}
        </AnimatePresence>
        {revealing && (
          <div className="display absolute bottom-0 text-[24px]" aria-live="polite">
            {revealing.winner === me.id ? (
              <>
                You <em>take it</em>
              </>
            ) : revealing.winner ? (
              <>
                {partner.name} <em>takes it</em>
              </>
            ) : (
              <>
                Same <em>throw</em>
              </>
            )}
          </div>
        )}
      </div>
      <div className="grid grid-cols-3 gap-3" role="group" aria-label="Your throw">
        {THROWS.map((t) => (
          <motion.button
            key={t.key}
            type="button"
            disabled={thrown || !!revealing || pending !== null}
            whileTap={{ scale: 0.9, rotate: -8 }}
            onClick={async () => {
              setPending(t.key);
              feedback("select");
              await sendMove(game.id, { pick: t.key });
              setPending(null);
            }}
            className={cn(
              "bg-s2 flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-[26px] border-0 text-sm font-bold text-[var(--text)] transition-opacity disabled:cursor-default",
              (thrown || revealing) && "opacity-40",
              pending === t.key && "bg-accent/25 opacity-100",
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/art/${t.key}.webp`}
              alt=""
              aria-hidden
              className="h-14 w-14 object-contain"
            />
            {t.label}
          </motion.button>
        ))}
      </div>
    </>
  );
}

/* --------------------------------------------------------- snap challenge */

export function SnapRoom({ game }: { game: GameRow }) {
  const { me, partner } = useCouple();
  const s = game.state as SnapState;
  const input = useRef<HTMLInputElement>(null);
  const { busy, progress, upload } = usePhotoUpload();
  const [voting, setVoting] = useState(false);
  if (game.status === "finished") return <GameOver game={game} type="snap" />;
  const done = s.submitted.includes(me.id);
  const shots = s.phase === "vote" ? s.shots[s.index] : null;

  return (
    <>
      <RoomHeader
        type="snap"
        live={game.status === "active"}
        counter={`${s.index + 1}/${s.prompts.length}`}
        progress={(s.index + (s.phase === "vote" ? 0.5 : 0)) / s.prompts.length}
      />
      <Scoreline mine={s.scores[me.id] ?? 0} theirs={s.scores[partner.id] ?? 0} label="SNAP" />
      <div className="mono text-faint mt-2 text-xs">THE PROMPT</div>
      <h2 className="display m-0 text-[32px] leading-[1.08]">{s.prompts[s.index]}</h2>

      {s.phase === "shoot" ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/art/snap.webp" alt="" aria-hidden className="h-28 w-28 object-contain" />
          {done ? (
            <WaitingOn text={`Sent. Waiting on ${partner.name}'s photo`} />
          ) : (
            <p className="text-muted m-0">
              Shoot it now. You both see each other&apos;s at the same moment.
            </p>
          )}
          <input
            ref={input}
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            data-testid="snap-input"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (!f) return;
              const id = await upload(f).catch(() => null);
              if (id) {
                feedback("send", "send");
                await sendMove(game.id, { mediaId: id });
              }
            }}
          />
          {!done && (
            <Button loading={busy} onClick={() => input.current?.click()} className="w-full">
              <Camera size={20} weight="bold" aria-hidden />
              Take the photo
            </Button>
          )}
          {busy && (
            <div className="bg-s2 h-1.5 w-full overflow-hidden rounded-full">
              <div
                className="bg-accent h-full transition-[width]"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-1 flex-col gap-3">
          <p className="text-muted m-0 text-sm">
            {done
              ? `Vote in. Waiting on ${partner.name}.`
              : "Which one nails it? Agree and it scores. Pick each other's and you both score."}
          </p>
          <div className="grid grid-cols-2 gap-3">
            {[me.id, partner.id].map((who, i) => {
              const mine = s.votes[s.index]?.[me.id] === who;
              return (
                <motion.button
                  key={who}
                  type="button"
                  disabled={done || voting}
                  aria-label={`Vote for ${who === me.id ? "your photo" : `${partner.name}'s photo`}`}
                  initial={{ opacity: 0.01, y: 20, rotate: i ? 3 : -3 }}
                  animate={{ opacity: 1, y: 0, rotate: i ? 2 : -2 }}
                  transition={{ delay: i * 0.12, type: "spring", stiffness: 300, damping: 22 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={async () => {
                    setVoting(true);
                    feedback("select");
                    await sendMove(game.id, { vote: who });
                    setVoting(false);
                  }}
                  className={cn(
                    "relative cursor-pointer overflow-hidden rounded-[22px] border-0 bg-white p-1.5 pb-8 text-left shadow-[0_14px_30px_-14px_rgba(0,0,0,.8)]",
                    mine && "outline-accent outline-[3px] outline-solid",
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={view(shots![who]!)}
                    alt={who === me.id ? "Your photo" : `${partner.name}'s photo`}
                    className="aspect-[3/4] w-full rounded-[16px] object-cover"
                  />
                  <span className="absolute bottom-2 left-3 text-sm font-bold text-[#111]">
                    {who === me.id ? "You" : partner.name}
                  </span>
                  {mine && (
                    <span className="bg-accent text-on-accent absolute right-2 bottom-1.5 flex h-6 w-6 items-center justify-center rounded-full">
                      <Check size={14} weight="bold" aria-hidden />
                    </span>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}

/* ------------------------------------------------------------- zoom guess */

export function ZoomRoom({ game }: { game: GameRow }) {
  const { me, partner } = useCouple();
  const s = game.state as ZoomState;
  const r = s.rounds[s.index]!;
  const setter = r.setter === me.id;
  const input = useRef<HTMLInputElement>(null);
  const { busy, upload } = usePhotoUpload();
  const [picked, setPicked] = useState<{ id: string; url: string } | null>(null);
  const [focus, setFocus] = useState({ x: 0.5, y: 0.5 });
  const [answer, setAnswer] = useState("");
  const [guess, setGuess] = useState("");
  const [sending, setSending] = useState(false);
  const [shake, setShake] = useState(0);
  const prev = s.rounds[s.index - 1];
  // When a round ends, show its answer for a moment before the next one.
  const ended = game.status === "finished" ? s.index : prev ? s.index - 1 : null;
  const endedRound = ended === null ? null : s.rounds[ended];
  const [dismissed, setDismissed] = useState(-1);
  const showPrev =
    ended !== null && endedRound && endedRound.solved !== null && ended > dismissed ? ended : null;
  useEffect(() => {
    if (showPrev === null || !endedRound) return;
    feedback(endedRound.solved ? "success" : "error", endedRound.solved ? "win" : "pop");
    const t = setTimeout(() => setDismissed(showPrev), 2600);
    return () => clearTimeout(t);
  }, [showPrev, endedRound]);

  if (game.status === "finished" && showPrev === null) return <GameOver game={game} type="zoom" />;

  const header = (
    <>
      <RoomHeader
        type="zoom"
        live={game.status === "active"}
        counter={`${s.index + 1}/${s.rounds.length}`}
        progress={(s.index + (r.mediaId ? 0.5 : 0)) / s.rounds.length}
      />
      <Scoreline mine={s.scores[me.id] ?? 0} theirs={s.scores[partner.id] ?? 0} label="ZOOM" />
    </>
  );

  if (showPrev !== null) {
    const rr = s.rounds[showPrev]!;
    return (
      <>
        {header}
        <div className="an-reveal flex flex-1 flex-col items-center justify-center gap-3 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={view(rr.mediaId!)}
            alt={rr.answer ?? ""}
            className="max-h-[46dvh] rounded-[24px] object-contain"
          />
          <div className="display text-[30px] leading-[1.1]">
            {rr.solved ? (
              <>
                Got it: <em>{rr.answer}</em>
              </>
            ) : (
              <>
                It was <em>{rr.answer}</em>
              </>
            )}
          </div>
        </div>
      </>
    );
  }

  if (!r.mediaId) {
    if (!setter)
      return (
        <>
          {header}
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/art/zoom.webp" alt="" aria-hidden className="h-28 w-28 object-contain" />
            <div className="display text-[28px]">
              {partner.name} is picking a <em>photo</em>
            </div>
            <WaitingOn text="Get ready to guess" />
          </div>
        </>
      );
    return (
      <>
        {header}
        <h2 className="display m-0 text-[30px] leading-[1.1]">
          Pick a photo for {partner.name} to <em>guess</em>
        </h2>
        <input
          ref={input}
          type="file"
          accept="image/*"
          hidden
          data-testid="zoom-input"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (!f) return;
            const url = URL.createObjectURL(f);
            const id = await upload(f).catch(() => null);
            if (id) setPicked({ id, url });
          }}
        />
        {picked ? (
          <>
            <p className="text-muted m-0 text-sm">Tap the spot they&apos;ll see up close first.</p>
            <button
              type="button"
              aria-label="Choose the close-up spot"
              onClick={(e) => {
                const b = e.currentTarget.getBoundingClientRect();
                setFocus({ x: (e.clientX - b.left) / b.width, y: (e.clientY - b.top) / b.height });
                feedback("tap");
              }}
              className="relative cursor-crosshair overflow-hidden rounded-[24px] border-0 p-0"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={picked.url}
                alt="Your photo"
                className="block max-h-[40dvh] w-full object-cover"
              />
              <span
                aria-hidden
                className="bg-accent/30 absolute h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,.45)]"
                style={{ left: `${focus.x * 100}%`, top: `${focus.y * 100}%` }}
              />
            </button>
            <Input
              aria-label="What is it?"
              placeholder="What is it? (they need to guess this)"
              maxLength={40}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
            />
            <Button
              loading={sending}
              disabled={answer.trim().length < 2}
              onClick={async () => {
                setSending(true);
                await sendMove(game.id, { mediaId: picked.id, answer, focus });
                setSending(false);
              }}
            >
              Send it
            </Button>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/art/zoom.webp" alt="" aria-hidden className="h-28 w-28 object-contain" />
            <p className="text-muted m-0 text-center">
              Something around you, a selfie, an old favourite. The trickier the close-up, the
              better.
            </p>
            <Button loading={busy} onClick={() => input.current?.click()} className="w-full">
              <ImageSquare size={20} weight="bold" aria-hidden />
              Choose a photo
            </Button>
          </div>
        )}
      </>
    );
  }

  const scale = ZOOM_LEVELS[r.level]!;
  const f = r.focus ?? { x: 0.5, y: 0.5 };
  return (
    <>
      {header}
      <div className="flex items-center justify-between">
        <h2 className="display m-0 text-[28px] leading-[1.1]">
          {setter ? (
            <>
              {partner.name} is <em>guessing</em>
            </>
          ) : (
            <>
              What&apos;s <em>this</em>?
            </>
          )}
        </h2>
        <span className="mono text-muted text-xs">{ZOOM_LEVELS.length - r.level} PTS</span>
      </div>
      <motion.div
        key={shake}
        animate={shake ? { x: [0, -10, 10, -6, 6, 0] } : {}}
        transition={{ duration: 0.4 }}
        className="bg-s2 relative aspect-square w-full overflow-hidden rounded-[28px]"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={view(r.mediaId)}
          alt="Close-up to guess"
          draggable={false}
          className="h-full w-full object-cover transition-transform duration-700 ease-[cubic-bezier(.2,.8,.2,1)] select-none"
          style={{ transform: `scale(${scale})`, transformOrigin: `${f.x * 100}% ${f.y * 100}%` }}
        />
        <div className="absolute right-3 bottom-3 flex gap-1" aria-hidden>
          {ZOOM_LEVELS.map((_, i) => (
            <span
              key={i}
              className="h-1.5 w-5 rounded-full"
              style={{ background: i <= r.level ? "var(--accent)" : "rgba(255,255,255,.3)" }}
            />
          ))}
        </div>
      </motion.div>
      {r.guesses.length > 0 && (
        <div className="flex flex-wrap gap-1.5" aria-label="Wrong guesses">
          {r.guesses.map((g, i) => (
            <span key={i} className="bg-s2 text-muted rounded-full px-3 py-1 text-sm line-through">
              {g}
            </span>
          ))}
        </div>
      )}
      {setter ? (
        <WaitingOn text={`Each miss zooms out. ${r.guesses.length} so far`} />
      ) : (
        <form
          className="flex gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!guess.trim()) return;
            setSending(true);
            const res = (await sendMove(game.id, { guess })) as { hit?: boolean } | null;
            setSending(false);
            setGuess("");
            if (res?.hit === false) {
              setShake((n) => n + 1);
              feedback("error");
            }
          }}
        >
          <Input
            aria-label="Your guess"
            placeholder="Your guess"
            maxLength={40}
            value={guess}
            onChange={(e) => setGuess(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" size="md" loading={sending}>
            Guess
          </Button>
        </form>
      )}
    </>
  );
}

/* ----------------------------------------------------------- photo memory */

export function MemoryRoom({ game }: { game: GameRow }) {
  const { me, partner } = useCouple();
  const s = game.state as MemoryState;
  const myTurn = s.turn === me.id;
  const [busy, setBusy] = useState<number | null>(null);
  const lastKey = s.last ? `${s.last.a}-${s.last.b}-${Object.keys(s.matched).length}` : null;
  const seenLast = useRef(lastKey);
  useEffect(() => {
    if (!s.last || lastKey === seenLast.current) return;
    seenLast.current = lastKey;
    feedback(s.last.match ? "success" : "tap", s.last.match ? "win" : "flip");
  }, [lastKey, s.last]);

  // A missed pair stays up for a beat, then flips back over.
  const missed = s.open.length === 2 && s.last && !s.last.match;
  const [flippedBack, setFlippedBack] = useState<string | null>(null);
  useEffect(() => {
    if (!missed) return;
    const t = setTimeout(() => setFlippedBack(lastKey), 1300);
    return () => clearTimeout(t);
  }, [missed, lastKey]);
  const hidden = missed && flippedBack === lastKey ? new Set(s.open) : null;

  const [over, setOver] = useState(false);
  useEffect(() => {
    if (game.status !== "finished") return;
    const t = setTimeout(() => setOver(true), 1400);
    return () => clearTimeout(t);
  }, [game.status]);
  if (over) return <GameOver game={game} type="memory" />;

  return (
    <>
      <RoomHeader
        type="memory"
        live={game.status === "active"}
        counter={`${Object.keys(s.matched).length / 2}/${s.size / 2}`}
        progress={Object.keys(s.matched).length / s.size}
      />
      <Scoreline mine={s.scores[me.id] ?? 0} theirs={s.scores[partner.id] ?? 0} label="PAIRS" />
      <div
        className={cn(
          "flex items-center justify-center gap-2 rounded-full py-2 text-sm font-bold transition-colors",
          myTurn ? "bg-accent/20 text-accent" : "bg-s2 text-muted",
        )}
        aria-live="polite"
      >
        {myTurn ? (
          "Your turn. Flip two."
        ) : (
          <>
            <Hourglass size={16} aria-hidden /> {partner.name}&apos;s turn
          </>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4" style={{ perspective: 900 }}>
        {Array.from({ length: s.size }, (_, i) => {
          const face = hidden?.has(i) ? undefined : s.faces[i];
          const up = Boolean(face);
          const matchedBy = s.matched[i];
          return (
            <motion.button
              key={i}
              type="button"
              aria-label={up ? `Card ${i + 1}, face up` : `Card ${i + 1}`}
              disabled={!myTurn || up || busy !== null || game.status !== "active"}
              onClick={async () => {
                setBusy(i);
                feedback("tap", "flip");
                await sendMove(game.id, { flip: i });
                setBusy(null);
              }}
              className="relative aspect-[3/4] cursor-pointer border-0 bg-transparent p-0 disabled:cursor-default"
              style={{ transformStyle: "preserve-3d" }}
              animate={{ rotateY: up ? 180 : 0, scale: matchedBy ? 0.94 : 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
            >
              <span
                className="bg-s2 absolute inset-0 flex items-center justify-center rounded-[18px] [backface-visibility:hidden]"
                style={{
                  background:
                    "radial-gradient(80% 60% at 30% 20%, color-mix(in oklab, var(--accent) 22%, transparent), transparent), var(--surface-2)",
                }}
              >
                {busy === i ? (
                  <LoadingDots className="text-accent" />
                ) : (
                  <span className="display text-accent/70 text-[22px]">c</span>
                )}
              </span>
              <span
                className="absolute inset-0 [transform:rotateY(180deg)] overflow-hidden rounded-[18px] bg-white [backface-visibility:hidden]"
                style={{
                  boxShadow: matchedBy
                    ? `0 0 0 3px ${matchedBy === me.id ? "var(--accent)" : "var(--partner-b)"}`
                    : undefined,
                }}
              >
                {face &&
                  (face.kind === "media" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={view(face.ref)} alt="" className="h-full w-full object-cover" />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={avatarSrc(face.ref)}
                      alt=""
                      className="bg-s3 h-full w-full object-contain p-3"
                    />
                  ))}
              </span>
            </motion.button>
          );
        })}
      </div>
    </>
  );
}
