"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowCounterClockwise } from "@phosphor-icons/react";
import { useCouple } from "@/features/couple/context";
import { Button, IconButton } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { feedback } from "@/lib/feedback";
import { GAME_META } from "../meta";
import type { BoardType } from "../engines/boards";
import { owarePlay, owareStart, owareWinner, type OwareBoard } from "../engines/board/oware";
import {
  fourupOver,
  fourupPlay,
  fourupStart,
  fourupTurn,
  fourupWinner,
  type FourUpBoard,
} from "../engines/board/fourup";
import {
  countPieces,
  draughtsPlay,
  draughtsResult,
  draughtsStart,
  type DraughtsBoard,
  type DraughtsSize,
} from "../engines/board/draughts";
import { BOT_LEVELS, draughtsBot, fourupBot, owareBot, type BotLevel } from "../engines/board/bots";
import { makeRng } from "../engines/board/rng";
import { DraughtsView, FourUpView, OwareView } from "./board-views";

type Pos = OwareBoard | FourUpBoard | DraughtsBoard;
const LEVEL_LABEL: Record<BotLevel, string> = { easy: "Easy", medium: "Medium", hard: "Hard" };

function start(kind: BoardType, size: DraughtsSize): Pos {
  return kind === "oware" ? owareStart() : kind === "fourup" ? fourupStart() : draughtsStart(size);
}
const turnOf = (kind: BoardType, p: Pos): 0 | 1 =>
  kind === "fourup" ? fourupTurn(p as FourUpBoard) : (p as OwareBoard | DraughtsBoard).turn;

/** Winner seat, null for a draw, undefined while playing. */
function outcome(kind: BoardType, p: Pos): 0 | 1 | null | undefined {
  if (kind === "oware") return owareWinner(p as OwareBoard);
  if (kind === "fourup")
    return fourupOver(p as FourUpBoard)
      ? (fourupWinner(p as FourUpBoard)?.seat ?? null)
      : undefined;
  return draughtsResult(p as DraughtsBoard);
}

function play(kind: BoardType, p: Pos, seat: 0 | 1, move: number | number[]): Pos {
  if (kind === "oware") return owarePlay(p as OwareBoard, seat, move as number);
  if (kind === "fourup") return fourupPlay(p as FourUpBoard, seat, move as number);
  return draughtsPlay(p as DraughtsBoard, seat, move);
}

/**
 * Practice against Clink, on this device only: nothing is sent or saved. Pick
 * how hard; you move first, then swap who starts each game.
 */
export function PracticeRoom({ kind }: { kind: BoardType }) {
  const router = useRouter();
  const { me } = useCouple();
  const [level, setLevel] = useState<BotLevel>("medium");
  const [size, setSize] = useState<DraughtsSize>(10);
  const [youStart, setYouStart] = useState(true);
  const [pos, setPos] = useState<Pos>(() => start(kind, 10));
  const rng = useMemo(() => makeRng(), []);
  const mySeat: 0 | 1 = youStart ? 0 : 1;
  const botSeat = (1 - mySeat) as 0 | 1;
  const result = outcome(kind, pos);
  const over = result !== undefined;
  const myTurn = !over && turnOf(kind, pos) === mySeat;
  const thinking = !over && !myTurn;
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Clink's move: a short pause so it reads as a reply, then think.
  useEffect(() => {
    if (over || turnOf(kind, pos) !== botSeat) return;
    timer.current = setTimeout(() => {
      const move =
        kind === "oware"
          ? owareBot(pos as OwareBoard, level, rng)
          : kind === "fourup"
            ? fourupBot(pos as FourUpBoard, level, rng)
            : draughtsBot(pos as DraughtsBoard, level, rng);
      setPos((p) => play(kind, p, botSeat, move));
    }, 450);
    return () => clearTimeout(timer.current);
  }, [pos, kind, level, botSeat, over, rng]);

  useEffect(() => {
    if (result === undefined) return;
    if (result === mySeat) feedback("success", "win");
    else feedback(result === null ? "tap" : "error");
  }, [result, mySeat]);

  function restart(opts: { swap?: boolean; size?: DraughtsSize } = {}) {
    clearTimeout(timer.current);
    if (opts.swap) setYouStart((v) => !v);
    const n = opts.size ?? size;
    if (opts.size) setSize(opts.size);
    setPos(start(kind, n));
  }

  const sides = { mine: `var(--partner-${me.role})`, theirs: "var(--champagne)" };
  const headline = over
    ? result === null
      ? "A draw."
      : result === mySeat
        ? "You beat Clink!"
        : "Clink wins this one."
    : myTurn
      ? "Your move"
      : "Clink is thinking";
  const score =
    kind === "oware"
      ? `You ${(pos as OwareBoard).scores[mySeat]} · Clink ${(pos as OwareBoard).scores[botSeat]} seeds`
      : kind === "draughts"
        ? `You ${countPieces((pos as DraughtsBoard).board, mySeat)} · Clink ${countPieces((pos as DraughtsBoard).board, botSeat)} pieces`
        : null;

  return (
    <div className="an-screen mx-auto flex min-h-dvh w-full max-w-[720px] flex-col gap-4 px-5 pt-[calc(env(safe-area-inset-top)+8px)] pb-8 md:pt-8">
      <div className="flex items-center gap-2">
        <IconButton label="Back to the games" onClick={() => router.push("/play")}>
          <ArrowLeft size={22} aria-hidden />
        </IconButton>
        <div className="min-w-0 flex-1">
          <h1 className="m-0 text-lg font-bold">{GAME_META[kind].name}: practice</h1>
          <p className="text-muted m-0 text-sm">Against Clink, on this device. Nothing is saved.</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="How hard">
        {BOT_LEVELS.map((l) => (
          <button
            key={l}
            type="button"
            aria-pressed={level === l}
            onClick={() => setLevel(l)}
            className={cn(
              "press h-9 rounded-full border px-4 text-sm font-semibold",
              level === l ? "border-accent bg-accent text-on-accent" : "border-line text-muted",
            )}
          >
            {LEVEL_LABEL[l]}
          </button>
        ))}
        {kind === "draughts" && (
          <div className="ml-auto flex gap-2" role="group" aria-label="Board size">
            {([10, 8] as const).map((n) => (
              <button
                key={n}
                type="button"
                aria-pressed={size === n}
                onClick={() => restart({ size: n })}
                className={cn(
                  "press h-9 rounded-full border px-3 text-sm font-semibold",
                  size === n ? "border-text text-text" : "border-line text-muted",
                )}
              >
                {n} by {n}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1" role="status" aria-live="polite">
        <div className={cn("display text-[30px] leading-tight", thinking && "text-muted")}>
          {headline}
        </div>
        {score && <div className="text-muted text-sm">{score}</div>}
      </div>

      {kind === "oware" ? (
        <OwareView
          board={pos as OwareBoard}
          mySeat={mySeat}
          canPlay={myTurn}
          sides={sides}
          theirName={"Clink"}
          lastPit={(pos as OwareBoard).history.at(-1)}
          onPlay={(pit) => setPos((p) => play(kind, p, mySeat, pit))}
        />
      ) : kind === "fourup" ? (
        <FourUpView
          board={pos as FourUpBoard}
          mySeat={mySeat}
          canPlay={myTurn}
          sides={sides}
          onPlay={(col) => setPos((p) => play(kind, p, mySeat, col))}
        />
      ) : (
        <DraughtsView
          board={pos as DraughtsBoard}
          mySeat={mySeat}
          canPlay={myTurn}
          sides={sides}
          onPlay={(path) => setPos((p) => play(kind, p, mySeat, path))}
        />
      )}

      <div className="flex flex-wrap gap-2">
        <Button variant={over ? "primary" : "ghost"} onClick={() => restart({ swap: true })}>
          <ArrowCounterClockwise size={18} aria-hidden />
          {over ? "Play again" : "Start over"}
        </Button>
        <span className="text-faint self-center text-sm">
          {youStart ? "You start this game." : "Clink starts this game."}
        </span>
      </div>
    </div>
  );
}
