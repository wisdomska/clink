"use client";
/**
 * The three boards, as plain views: they show a position from one player's
 * side and report taps. Used by real games (board-rooms) and practice against
 * Clink (practice-room), so both look and feel the same.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Crown } from "@phosphor-icons/react";
import { cn } from "@/components/ui/cn";
import { haptic, playSeeds, playSound } from "@/lib/feedback";
import { BOTTOM_ROW, TOP_ROW, legalPits, type OwareBoard } from "../engines/board/oware";
import { COLS, ROWS, dropRow, fourupWinner, type FourUpBoard } from "../engines/board/fourup";
import {
  isDark,
  isKing,
  legalMoves,
  seatOf,
  sizeOf,
  type DMove,
  type DraughtsBoard,
} from "../engines/board/draughts";

/** Colours: yours and theirs, in partner colours. */
export interface Sides {
  mine: string;
  theirs: string;
}

/**
 * A sound for each new move, whoever made it: seeds dropping one by one in
 * Oware, a disc landing in Four Up, a wooden knock in Draughts (two for a
 * capture). Silent on first load, and when sound is off in Settings.
 */
export function useBoardSounds(
  kind: "oware" | "fourup" | "draughts",
  board: OwareBoard | FourUpBoard | DraughtsBoard,
) {
  const prev = useRef(board);
  const moves = (b: typeof board) =>
    kind === "oware"
      ? (b as OwareBoard).history.length
      : kind === "fourup"
        ? (b as FourUpBoard).moves.length
        : (b as DraughtsBoard).moves.length;
  useEffect(() => {
    const before = prev.current;
    prev.current = board;
    if (moves(board) !== moves(before) + 1) return;
    if (kind === "oware") {
      const pit = (board as OwareBoard).history.at(-1)!;
      playSeeds((before as OwareBoard).pits[pit] ?? 0);
    } else if (kind === "fourup") playSound("drop");
    else {
      const caps =
        (before as DraughtsBoard).board.filter(Boolean).length -
        (board as DraughtsBoard).board.filter(Boolean).length;
      playSound("knock");
      if (caps > 0) setTimeout(() => playSound("knock"), 110);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board, kind]);
}

/* ------------------------------------------------------------------ Oware */

/**
 * Two rows of six pits; yours along the bottom, sowing to the right. Each pit
 * shows its seeds as dots (a number once there are many) and the count.
 */
export function OwareView({
  board,
  mySeat,
  canPlay,
  onPlay,
  sides,
  lastPit,
  theirName = "Them",
}: {
  board: OwareBoard;
  mySeat: 0 | 1;
  canPlay: boolean;
  onPlay: (pit: number) => void;
  sides: Sides;
  lastPit?: number;
  /** who sits opposite: their name, or Clink in practice */
  theirName?: string;
}) {
  const legal = canPlay ? legalPits(board.pits, mySeat) : [];
  // From your side, your pits run left to right along the bottom.
  const bottom = mySeat === 0 ? BOTTOM_ROW : TOP_ROW.slice().reverse();
  const top = mySeat === 0 ? TOP_ROW : BOTTOM_ROW.slice().reverse();
  const store = (seat: 0 | 1, label: string) => (
    <div
      className="border-line bg-s2 flex w-10 flex-none flex-col items-center justify-center gap-1 self-stretch rounded-[999px] border sm:w-16"
      aria-label={`${label}: ${board.scores[seat]} captured`}
    >
      <span
        className="mono text-xl leading-none font-bold sm:text-2xl"
        style={{ color: seat === mySeat ? sides.mine : sides.theirs }}
      >
        {board.scores[seat]}
      </span>
      <span className="text-faint max-w-full truncate px-0.5 text-[9px] uppercase sm:text-[10px]">
        {label}
      </span>
    </div>
  );
  const pit = (i: number, mine: boolean) => {
    const n = board.pits[i]!;
    const playable = mine && legal.includes(i);
    const count = (
      <span
        className={cn("mono text-[11px] leading-none sm:text-xs", n ? "text-muted" : "text-faint")}
      >
        {n}
      </span>
    );
    return (
      <div key={i} className="flex min-w-0 flex-col items-center gap-1">
        {!mine && count}
        <button
          type="button"
          disabled={!playable}
          onClick={() => {
            haptic("tap");
            onPlay(i);
          }}
          aria-label={`${mine ? "Your" : "Their"} pit ${(i % 6) + 1}, ${n} ${n === 1 ? "seed" : "seeds"}${playable ? ", tap to sow" : ""}`}
          className={cn(
            "flex aspect-square w-full items-center justify-center rounded-full border transition-colors",
            "bg-[radial-gradient(circle_at_50%_35%,var(--board-pit-deep),var(--board-pit))] shadow-[inset_0_3px_6px_rgba(0,0,0,.6)]",
            playable
              ? "border-accent/70 press cursor-pointer shadow-[0_0_0_2px_color-mix(in_oklab,var(--accent)_25%,transparent),inset_0_3px_6px_rgba(0,0,0,.6)]"
              : "cursor-default border-transparent",
            lastPit === i && "ring-2 ring-[var(--champagne)]/60",
          )}
        >
          <Seeds n={n} color={mine ? sides.mine : sides.theirs} />
        </button>
        {mine && count}
      </div>
    );
  };
  return (
    <div
      className="rounded-card border-line flex items-stretch gap-2 border bg-[linear-gradient(180deg,var(--board-wood),var(--board-wood-deep))] p-2 sm:gap-3 sm:p-4"
      role="group"
      aria-label="Oware board"
    >
      {store((1 - mySeat) as 0 | 1, theirName)}
      <div className="grid min-w-0 flex-1 grid-cols-6 gap-x-1.5 gap-y-2 sm:gap-x-2.5 sm:gap-y-3">
        {top.map((i) => pit(i, false))}
        {bottom.map((i) => pit(i, true))}
      </div>
      {store(mySeat, "You")}
    </div>
  );
}

/** Up to 12 seeds drawn as dots in a loose ring; more than that, a cluster. */
function Seeds({ n, color }: { n: number; color: string }) {
  const dots = Math.min(n, 12);
  return (
    <span className="relative block h-[62%] w-[62%]" aria-hidden>
      {Array.from({ length: dots }, (_, k) => {
        const ring = k < 6 ? 0.32 : 0.12;
        const a = (k * 2 * Math.PI) / Math.min(6, dots) + (k >= 6 ? 0.5 : 0);
        const x = 50 + Math.cos(a) * ring * 100;
        const y = 50 + Math.sin(a) * ring * 100;
        return (
          <span
            key={k}
            className="absolute h-[22%] w-[22%] -translate-x-1/2 -translate-y-1/2 rounded-full shadow-[inset_0_-1px_1px_rgba(0,0,0,.4)]"
            style={{ left: `${x}%`, top: `${y}%`, background: color, opacity: 0.9 }}
          />
        );
      })}
    </span>
  );
}

/* ---------------------------------------------------------------- Four Up */

/** Tap a column to drop a disc. The winning four glows. */
export function FourUpView({
  board,
  mySeat,
  canPlay,
  onPlay,
  sides,
}: {
  board: FourUpBoard;
  mySeat: 0 | 1;
  canPlay: boolean;
  onPlay: (col: number) => void;
  sides: Sides;
}) {
  const win = fourupWinner(board);
  const line = new Set(win?.line ?? []);
  const last = board.moves.length
    ? (() => {
        const c = board.moves[board.moves.length - 1]!;
        for (let r = 0; r < ROWS; r++) if (board.grid[r * COLS + c]) return r * COLS + c;
        return -1;
      })()
    : -1;
  const color = (v: number) => (v - 1 === mySeat ? sides.mine : sides.theirs);
  return (
    <div
      className="rounded-card border-line mx-auto w-full max-w-[460px] border bg-[linear-gradient(180deg,var(--board-night),var(--board-night-deep))] p-2 sm:p-3"
      role="group"
      aria-label="Four Up board"
    >
      <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
        {Array.from({ length: COLS }, (_, c) => {
          const open = dropRow(board.grid, c) >= 0;
          return (
            <button
              key={c}
              type="button"
              disabled={!canPlay || !open}
              onClick={() => {
                haptic("tap");
                onPlay(c);
              }}
              aria-label={`Column ${c + 1}${open ? "" : ", full"}`}
              className={cn(
                "group flex flex-col gap-1 rounded-full p-0.5 sm:gap-1.5",
                canPlay && open ? "cursor-pointer hover:bg-white/5" : "cursor-default",
              )}
            >
              {Array.from({ length: ROWS }, (_, r) => {
                const v = board.grid[r * COLS + c]!;
                const i = r * COLS + c;
                return (
                  <span
                    key={r}
                    className={cn(
                      "block aspect-square w-full rounded-full shadow-[inset_0_2px_4px_rgba(0,0,0,.55)]",
                      !v && "bg-black/40",
                      v > 0 &&
                        i === last &&
                        "motion-safe:animate-[fu-drop_.32s_cubic-bezier(.3,1.4,.6,1)]",
                      line.has(i) &&
                        "ring-2 ring-[var(--champagne)] ring-offset-2 ring-offset-[var(--board-night-deep)]",
                    )}
                    style={
                      v
                        ? {
                            background: `radial-gradient(circle at 35% 30%, color-mix(in oklab, ${color(v)} 70%, white), ${color(v)})`,
                            ["--fu-rows" as string]: r + 1,
                          }
                        : undefined
                    }
                  />
                );
              })}
            </button>
          );
        })}
      </div>
      <style>{`@keyframes fu-drop { from { transform: translateY(calc(var(--fu-rows) * -110%)); } to { transform: none; } }`}</style>
    </div>
  );
}

/* --------------------------------------------------------------- Draughts */

/**
 * Tap one of your pieces, then where it goes. Captures are compulsory: only
 * pieces that can capture light up. A multi-jump is tapped one landing at a
 * time, or straight to the end when there's only one way there.
 */
export function DraughtsView({
  board,
  mySeat,
  canPlay,
  onPlay,
  sides,
}: {
  board: DraughtsBoard;
  mySeat: 0 | 1;
  canPlay: boolean;
  onPlay: (path: number[]) => void;
  sides: Sides;
}) {
  const n = sizeOf(board.board);
  const moves = useMemo(
    () => (canPlay ? legalMoves(board.board, mySeat) : []),
    [board.board, mySeat, canPlay],
  );
  const [path, setPath] = useState<number[]>([]);
  const lastPath = board.moves[board.moves.length - 1] ?? [];
  const candidates: DMove[] = path.length
    ? moves.filter((m) => path.every((sq, i) => m.path[i] === sq))
    : moves;
  const starts = new Set(moves.map((m) => m.path[0]!));
  const nextSteps = new Set(
    path.length ? candidates.map((m) => m.path[path.length]).filter((x) => x !== undefined) : [],
  );
  // Landing squares further along a single capture line can be tapped directly.
  const ends = new Map<number, DMove[]>();
  if (path.length)
    for (const m of candidates) {
      const end = m.path[m.path.length - 1]!;
      ends.set(end, [...(ends.get(end) ?? []), m]);
    }

  function tap(sq: number) {
    if (!canPlay) return;
    const p = board.board[sq]!;
    if (p && seatOf(p) === mySeat) {
      setPath(starts.has(sq) ? [sq] : []);
      haptic(starts.has(sq) ? "tap" : "error");
      return;
    }
    if (!path.length) return;
    let next: number[] | null = null;
    if (nextSteps.has(sq)) next = [...path, sq];
    else if (ends.get(sq)?.length === 1) next = ends.get(sq)![0]!.path;
    if (!next) return;
    const exact = moves.filter(
      (m) => m.path.length === next.length && m.path.every((x, i) => x === next[i]),
    );
    const longer = moves.filter(
      (m) => m.path.length > next.length && next.every((x, i) => m.path[i] === x),
    );
    if (exact.length && !longer.length) {
      setPath([]);
      haptic("success");
      onPlay(next);
    } else setPath(next);
  }

  // Your pieces at the bottom: seat 1 sees the board turned round.
  const order = Array.from({ length: n * n }, (_, i) => (mySeat === 0 ? i : n * n - 1 - i));
  const mustCapture = moves.length > 0 && moves[0]!.caps.length > 0;
  return (
    <div className="flex flex-col gap-2">
      <div
        className="rounded-card border-line mx-auto grid w-full max-w-[520px] overflow-hidden border"
        style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}
        role="grid"
        aria-label={`Draughts board, ${n} by ${n}`}
      >
        {order.map((sq) => {
          const dark = isDark(sq, n);
          const p = board.board[sq]!;
          const mine = p > 0 && seatOf(p) === mySeat;
          const selectable = canPlay && mine && starts.has(sq);
          const selected = path[0] === sq || path.includes(sq);
          const target = nextSteps.has(sq) || (path.length > 0 && ends.has(sq));
          const wasLast = lastPath.includes(sq);
          return (
            <button
              key={sq}
              type="button"
              tabIndex={dark ? 0 : -1}
              disabled={!dark}
              onClick={() => tap(sq)}
              aria-label={
                dark
                  ? `${p ? `${mine ? "Your" : "Their"} ${isKing(p) ? "king" : "piece"}` : "Empty"}${target ? ", move here" : selectable ? ", can move" : ""}`
                  : undefined
              }
              className={cn(
                "relative flex aspect-square items-center justify-center",
                dark ? "bg-[var(--board-dark)]" : "bg-[var(--board-light)]",
                wasLast && dark && "bg-[var(--board-dark-last)]",
                dark && "cursor-pointer",
              )}
            >
              {p ? (
                <span
                  className={cn(
                    "flex h-[68%] w-[68%] items-center justify-center rounded-full shadow-[inset_0_-3px_0_rgba(0,0,0,.35),0_2px_4px_rgba(0,0,0,.4)]",
                    selected &&
                      "ring-2 ring-[var(--champagne)] ring-offset-1 ring-offset-[var(--board-dark)]",
                    selectable && !selected && mustCapture && "motion-safe:animate-pulse",
                  )}
                  style={{ background: mine ? sides.mine : sides.theirs }}
                  aria-hidden
                >
                  {isKing(p) && <Crown weight="fill" className="h-[55%] w-[55%] text-white/90" />}
                </span>
              ) : target ? (
                <span
                  className="h-[30%] w-[30%] rounded-full bg-[var(--champagne)]/80"
                  aria-hidden
                />
              ) : null}
            </button>
          );
        })}
      </div>
      {canPlay && mustCapture && (
        <p className="text-muted m-0 text-center text-sm">
          You have to capture: the glowing pieces can.
        </p>
      )}
    </div>
  );
}
