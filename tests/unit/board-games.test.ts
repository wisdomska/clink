import { describe, it, expect } from "vitest";
import {
  owareStart,
  owarePlay,
  sow,
  legalPits,
  owareWinner,
  type OwareBoard,
} from "@/features/play/engines/board/oware";
import {
  fourupStart,
  fourupPlay,
  fourupWinner,
  fourupOver,
  COLS,
  ROWS,
} from "@/features/play/engines/board/fourup";
import {
  draughtsStart,
  draughtsPlay,
  legalMoves,
  draughtsResult,
  MAN0,
  MAN1,
  KING0,
  EMPTY,
  type DraughtsBoard,
} from "@/features/play/engines/board/draughts";
import { owareBot, fourupBot, draughtsBot } from "@/features/play/engines/board/bots";
import { makeRng } from "@/features/play/engines/board/rng";

describe("oware (Abapa)", () => {
  it("sows anticlockwise from a pit", () => {
    const s = owarePlay(owareStart(), 0, 2);
    expect(s.pits.slice(0, 7)).toEqual([4, 4, 0, 5, 5, 5, 5]);
    expect(s.turn).toBe(1);
  });
  it("captures 2s and 3s backwards on the rival side", () => {
    const pits = new Array(12).fill(0);
    pits[4] = 3; // lands on 5, 6, 7
    pits[6] = 1;
    pits[7] = 2;
    pits[9] = 4;
    const r = sow(pits, 4);
    expect(r.captured).toEqual([7, 6]);
    expect(r.gain).toBe(5);
  });
  it("a grand slam captures nothing", () => {
    const pits = new Array(12).fill(0);
    pits[5] = 1;
    pits[6] = 2; // the only rival seeds
    const r = sow(pits, 5);
    expect(r.grandSlam).toBe(true);
    expect(r.gain).toBe(0);
  });
  it("you must feed an empty rival when you can", () => {
    const pits = new Array(12).fill(0);
    pits[0] = 1; // can't reach the rival
    pits[3] = 5; // reaches pits 4..8
    expect(legalPits(pits, 0)).toEqual([3]);
  });
  it("25 seeds wins", () => {
    const s: OwareBoard = { ...owareStart(), scores: [25, 3], over: true };
    expect(owareWinner(s)).toBe(0);
  });
  it("refuses the rival's pit and moves out of turn", () => {
    expect(() => owarePlay(owareStart(), 0, 7)).toThrow();
    expect(() => owarePlay(owareStart(), 1, 7)).toThrow();
  });
});

describe("four up", () => {
  it("four in a row wins", () => {
    let s = fourupStart();
    for (const c of [0, 6, 1, 6, 2, 6, 3]) s = fourupPlay(s, (s.moves.length % 2) as 0 | 1, c);
    expect(fourupWinner(s)?.seat).toBe(0);
    expect(fourupOver(s)).toBe(true);
    expect(() => fourupPlay(s, 1, 5)).toThrow();
  });
  it("a full column refuses more discs", () => {
    let s = fourupStart();
    for (let i = 0; i < ROWS; i++) s = fourupPlay(s, (i % 2) as 0 | 1, 0);
    expect(() => fourupPlay(s, 0, 0)).toThrow(/full/);
    expect(s.grid.length).toBe(COLS * ROWS);
  });
});

describe("draughts", () => {
  it("international is 10 by 10 with 20 men each, English 8 by 8 with 12", () => {
    expect(draughtsStart().board.filter((p) => p === MAN0).length).toBe(20);
    expect(draughtsStart(8).board.filter((p) => p === MAN1).length).toBe(12);
  });
  it("captures are compulsory", () => {
    const b = new Array(64).fill(EMPTY);
    b[5 * 8 + 2] = MAN0; // row 5 col 2
    b[4 * 8 + 3] = MAN1; // diagonal in front
    b[7 * 8 + 6] = MAN0; // another man that could just step
    const s: DraughtsBoard = { board: b, turn: 0, quiet: 0, moves: [] };
    const ms = legalMoves(s.board, 0);
    expect(ms.every((m) => m.caps.length === 1)).toBe(true);
    expect(() => draughtsPlay(s, 0, [7 * 8 + 6, 6 * 8 + 5])).toThrow();
  });
  it("international takes the longest line and kings fly", () => {
    const b = new Array(100).fill(EMPTY);
    b[9 * 10 + 0] = KING0;
    b[6 * 10 + 3] = MAN1; // far along the diagonal
    const ms = legalMoves(b, 0);
    expect(ms.some((m) => m.caps.includes(63) && m.path[1]! < 63)).toBe(true);
  });
  it("an English man crowns on the far row", () => {
    const b = new Array(64).fill(EMPTY);
    b[1 * 8 + 2] = MAN0;
    b[7 * 8 + 0] = MAN1;
    const s = draughtsPlay({ board: b, turn: 0, quiet: 0, moves: [] }, 0, [10, 1]);
    expect(s.board[1]).toBe(KING0);
  });
  it("no legal move loses", () => {
    const b = new Array(64).fill(EMPTY);
    b[0 * 8 + 1] = MAN0; // a man on the far row can't move forward
    b[7 * 8 + 0] = MAN1;
    expect(draughtsResult({ board: b, turn: 0, quiet: 0, moves: [] })).toBe(1);
  });
});

describe("practice bot", () => {
  const rng = makeRng(7);
  it("always plays a legal move at every level", () => {
    for (const level of ["easy", "medium", "hard"] as const) {
      const o = owareStart();
      expect(legalPits(o.pits, 0)).toContain(owareBot(o, level, rng));
      const d = draughtsStart(8);
      const path = draughtsBot(d, level, rng);
      expect(() => draughtsPlay(d, 0, path)).not.toThrow();
      expect(fourupBot(fourupStart(), level, rng)).toBeGreaterThanOrEqual(0);
    }
  });
  it("hard takes a win and blocks a loss in four up", () => {
    let s = fourupStart();
    for (const c of [0, 6, 1, 6, 2]) s = fourupPlay(s, (s.moves.length % 2) as 0 | 1, c);
    // seat 1 to move: must block column 3
    expect(fourupBot(s, "hard", rng)).toBe(3);
    s = fourupPlay(s, 1, 5);
    // seat 0 to move: wins in column 3
    expect(fourupBot(s, "hard", rng)).toBe(3);
  });
});
