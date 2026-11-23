/**
 * Board games played slowly, a turn at a time (Oware, Four Up, Draughts). The
 * rules live in ./board/*; this wraps them for the game server: who sits
 * where, whose turn it is, draw offers, and a line about the last move for the
 * other person ("Theo captured 4. Your move.").
 */
import { MoveError, other, type EngineResult, type Players } from "./types";
import { owarePlay, owareStart, owareWinner, type OwareBoard } from "./board/oware";
import {
  fourupPlay,
  fourupStart,
  fourupTurn,
  fourupWinner,
  fourupOver,
  type FourUpBoard,
} from "./board/fourup";
import {
  countPieces,
  draughtsPlay,
  draughtsResult,
  draughtsStart,
  type DraughtsBoard,
  type DraughtsSize,
} from "./board/draughts";

export type BoardType = "oware" | "fourup" | "draughts";
export const BOARD_TYPES: BoardType[] = ["oware", "fourup", "draughts"];
export const isBoardType = (t: string): t is BoardType => (BOARD_TYPES as string[]).includes(t);

export interface BoardState {
  kind: BoardType;
  board: OwareBoard | FourUpBoard | DraughtsBoard;
  /** user id -> seat (0 moves first) */
  seats: Record<string, 0 | 1>;
  lastMoveAt: string;
  last?: { by: string; captured: number };
  /** who offered a draw, while it stands */
  drawOffer?: string | null;
  /** how it ended, in words */
  reason?: string;
}

const seatTurn = (s: BoardState): 0 | 1 =>
  s.kind === "fourup"
    ? fourupTurn(s.board as FourUpBoard)
    : (s.board as OwareBoard | DraughtsBoard).turn;

export const userForSeat = (s: BoardState, seat: 0 | 1) =>
  Object.entries(s.seats).find(([, v]) => v === seat)?.[0] ?? null;

export function boardInit(
  kind: BoardType,
  p: Players,
  opts: { size?: DraughtsSize } = {},
  now = new Date(),
): EngineResult<BoardState, Record<string, never>> {
  const board =
    kind === "oware"
      ? owareStart()
      : kind === "fourup"
        ? fourupStart()
        : draughtsStart(opts.size ?? 10);
  return {
    state: {
      kind,
      board,
      seats: { [p.starter]: 0, [other(p, p.starter)]: 1 },
      lastMoveAt: now.toISOString(),
      drawOffer: null,
    },
    secrets: {},
    turn: p.starter,
  };
}

/** Pieces or seeds each side has, for the score line. */
export function boardScores(s: BoardState): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [uid, seat] of Object.entries(s.seats)) {
    if (s.kind === "oware") out[uid] = (s.board as OwareBoard).scores[seat];
    else if (s.kind === "draughts") out[uid] = countPieces((s.board as DraughtsBoard).board, seat);
    else out[uid] = fourupWinner(s.board as FourUpBoard)?.seat === seat ? 1 : 0;
  }
  return out;
}

function result(s: BoardState): { over: boolean; winnerSeat: 0 | 1 | null; reason?: string } {
  if (s.kind === "oware") {
    const b = s.board as OwareBoard;
    const w = owareWinner(b);
    return w === undefined
      ? { over: false, winnerSeat: null }
      : { over: true, winnerSeat: w, reason: b.reason === "score" ? undefined : b.reason };
  }
  if (s.kind === "fourup") {
    const b = s.board as FourUpBoard;
    if (!fourupOver(b)) return { over: false, winnerSeat: null };
    const w = fourupWinner(b);
    return { over: true, winnerSeat: w?.seat ?? null, reason: w ? "four in a line" : "board full" };
  }
  const b = s.board as DraughtsBoard;
  const w = draughtsResult(b);
  if (w === undefined) return { over: false, winnerSeat: null };
  return {
    over: true,
    winnerSeat: w,
    reason:
      w === null
        ? "a long run with no captures"
        : countPieces(b.board, b.turn)
          ? "no moves left"
          : "no pieces left",
  };
}

export function boardMove(
  p: Players,
  s: BoardState,
  userId: string,
  move: {
    pit?: number;
    col?: number;
    path?: number[];
    offerDraw?: boolean;
    acceptDraw?: boolean;
    declineDraw?: boolean;
  },
  now = new Date(),
): EngineResult<BoardState, Record<string, never>> & { offered?: boolean } {
  const seat = s.seats[userId];
  if (seat === undefined) throw new MoveError("You're not in this game.");
  const them = other(p, userId);
  const turnUser = userForSeat(s, seatTurn(s));

  if (move.offerDraw) {
    if (s.drawOffer) throw new MoveError("A draw is already on the table.");
    return {
      state: { ...s, drawOffer: userId },
      secrets: {},
      turn: turnUser,
      notifyTurn: them,
      offered: true,
    };
  }
  if (move.acceptDraw) {
    if (s.drawOffer !== them) throw new MoveError("There's no draw offer to accept.");
    const state = { ...s, drawOffer: null, reason: "agreed a draw" };
    return {
      state,
      secrets: {},
      finished: true,
      isDraw: true,
      winnerId: null,
      turn: null,
      scores: boardScores(state),
    };
  }
  if (move.declineDraw) {
    if (s.drawOffer !== them) throw new MoveError("There's no draw offer to decline.");
    return { state: { ...s, drawOffer: null }, secrets: {}, turn: turnUser };
  }

  if (turnUser !== userId) throw new MoveError("It's their move.");
  let board: BoardState["board"];
  let captured = 0;
  try {
    if (s.kind === "oware") {
      const b = s.board as OwareBoard;
      if (!Number.isInteger(move.pit)) throw new MoveError("Pick a pit.");
      const next = owarePlay(b, seat, move.pit!);
      captured = next.scores[seat] - b.scores[seat];
      board = next;
    } else if (s.kind === "fourup") {
      if (!Number.isInteger(move.col)) throw new MoveError("Pick a column.");
      board = fourupPlay(s.board as FourUpBoard, seat, move.col!);
    } else {
      const b = s.board as DraughtsBoard;
      const next = draughtsPlay(b, seat, move.path);
      captured =
        countPieces(b.board, (1 - seat) as 0 | 1) - countPieces(next.board, (1 - seat) as 0 | 1);
      board = next;
    }
  } catch (e) {
    if (e instanceof MoveError) throw e;
    throw new MoveError(e instanceof Error ? e.message : "That move isn't allowed.");
  }
  // Moving instead of answering a draw offer turns it down.
  const state: BoardState = {
    ...s,
    board,
    lastMoveAt: now.toISOString(),
    last: { by: userId, captured },
    drawOffer: null,
  };
  const r = result(state);
  if (r.over) {
    const winnerId = r.winnerSeat === null ? null : userForSeat(state, r.winnerSeat);
    const done = { ...state, reason: r.reason };
    return {
      state: done,
      secrets: {},
      finished: true,
      winnerId,
      isDraw: r.winnerSeat === null,
      turn: null,
      notifyTurn: them,
      scores: boardScores(done),
    };
  }
  const next = userForSeat(state, seatTurn(state));
  return { state, secrets: {}, turn: next, notifyTurn: next, scores: boardScores(state) };
}
