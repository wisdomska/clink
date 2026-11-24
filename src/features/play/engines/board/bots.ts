/**
 * "Play against Clink": practice opponents for the board games, on the device
 * only (nothing is sent or stored).
 */
import { searchBest, type SearchGame } from "./search";
import type { Rng } from "./rng";
import { legalPits, owarePlay, sideSeeds, type OwareBoard, type Seat as OSeat } from "./oware";
import { COLS, ROWS, dropRow, lineThrough, openCols, type FourUpBoard, type Grid } from "./fourup";
import {
  applyDMove,
  draughtsResult,
  isKing,
  legalMoves,
  nextQuiet,
  quietLimit,
  seatOf,
  sizeOf,
  type Board,
  type DMove,
  type DraughtsBoard,
  type Seat as DSeat,
} from "./draughts";

export const BOT_LEVELS = ["easy", "medium", "hard"] as const;
export type BotLevel = (typeof BOT_LEVELS)[number];
// Easy looks two moves ahead (it takes a win and blocks one, like a beginner),
// medium four, hard as far as it can in about a fifth of a second.
const BUDGET: Record<BotLevel, number> = { easy: 40, medium: 120, hard: 450 };
const DEPTH: Record<BotLevel, number> = { easy: 2, medium: 4, hard: 20 };

/** How close to its best a move must score to be picked at random, per level (in each game's own units). */
type Margins = Record<BotLevel, number>;

function choose<P, M extends NonNullable<unknown>>(
  g: SearchGame<P, M>,
  pos: P,
  seat: number,
  level: BotLevel,
  rng: Rng,
  margins: Margins,
  qDepth = 0,
): M {
  const legal = g.moves(pos);
  if (!legal.length) throw new Error("no legal moves");
  return searchBest(g, pos, seat, {
    budgetMs: BUDGET[level],
    maxDepth: DEPTH[level],
    rng,
    qDepth: level === "hard" ? qDepth : 0,
    margin: margins[level],
  });
}

/* Oware: captured seeds count most; seeds on your own side are a small edge. */
const owareSearch: SearchGame<OwareBoard, number> = {
  toMove: (p) => p.turn,
  terminal: (p) => {
    if (!p.over) return null;
    const [a, b] = p.scores;
    return { winner: a === b ? null : a > b ? 0 : 1 };
  },
  moves: (p) => legalPits(p.pits, p.turn),
  stuck: () => ({ winner: null }),
  play: (p, pit) => owarePlay({ ...p, history: [] }, p.turn, pit),
  evaluate: (p, seat) => {
    const me = seat as OSeat;
    const them = (1 - seat) as OSeat;
    return (p.scores[me] - p.scores[them]) * 10 + (sideSeeds(p.pits, me) - sideSeeds(p.pits, them));
  },
};
export const owareBot = (s: OwareBoard, level: BotLevel, rng: Rng) =>
  choose(owareSearch, { ...s, history: [] }, s.turn, level, rng, { easy: 25, medium: 8, hard: 0 });

/* Four Up: open windows of four count by how full they are; the centre column helps. */
interface FP {
  g: Grid;
  turn: number;
  last: number;
}
const ORDER = [3, 2, 4, 1, 5, 0, 6];
const WINDOWS: number[][] = (() => {
  const out: number[][] = [];
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      for (const [dr, dc] of [
        [0, 1],
        [1, 0],
        [1, 1],
        [1, -1],
      ] as const) {
        const w: number[] = [];
        for (let k = 0; k < 4; k++) {
          const rr = r + dr * k;
          const cc = c + dc * k;
          if (rr < 0 || rr >= ROWS || cc < 0 || cc >= COLS) break;
          w.push(rr * COLS + cc);
        }
        if (w.length === 4) out.push(w);
      }
  return out;
})();
const LINE = [0, 1, 6, 40];
const fourupSearch: SearchGame<FP, number> = {
  toMove: (p) => p.turn,
  terminal: (p) => {
    if (p.last >= 0 && lineThrough(p.g, p.last)) return { winner: p.g[p.last]! - 1 };
    return openCols(p.g).length ? null : { winner: null };
  },
  moves: (p) => ORDER.filter((c) => !p.g[c]),
  stuck: () => ({ winner: null }),
  play: (p, c) => {
    const r = dropRow(p.g, c);
    const g = p.g.slice();
    g[r * COLS + c] = p.turn + 1;
    return { g, turn: 1 - p.turn, last: r * COLS + c };
  },
  evaluate: (p, seat) => {
    const me = seat + 1;
    let s = 0;
    for (const w of WINDOWS) {
      let mine = 0;
      let theirs = 0;
      for (const i of w) {
        if (p.g[i] === me) mine++;
        else if (p.g[i]) theirs++;
      }
      if (mine && !theirs) s += LINE[mine]!;
      else if (theirs && !mine) s -= LINE[theirs]!;
    }
    for (let r = 0; r < ROWS; r++) {
      const v = p.g[r * COLS + 3];
      if (v) s += v === me ? 3 : -3;
    }
    return s;
  },
};
export const fourupBot = (s: FourUpBoard, level: BotLevel, rng: Rng) => {
  const turn = s.moves.length % 2;
  return choose(fourupSearch, { g: s.grid, turn, last: -1 }, turn, level, rng, {
    easy: 12,
    medium: 4,
    hard: 0,
  });
};

/* Draughts: men 100, kings 160 (250 where they fly), a little for advancing and the centre. */
interface DP {
  b: Board;
  turn: DSeat;
  quiet: number;
}
function evalDraughts(b: Board, seat: number): number {
  const n = sizeOf(b);
  const kingValue = n === 10 ? 250 : 160;
  let s = 0;
  for (let sq = 0; sq < b.length; sq++) {
    const p = b[sq]!;
    if (!p) continue;
    const owner = seatOf(p);
    let v: number;
    if (isKing(p)) v = kingValue;
    else {
      const r = Math.floor(sq / n);
      const advance = owner === 0 ? n - 1 - r : r;
      v = 100 + advance * 4 + (advance === 0 ? 8 : 0);
    }
    const c = sq % n;
    if (c >= 2 && c <= n - 3) v += 3;
    s += owner === seat ? v : -v;
  }
  return s + endgamePress(b, seat, n, s);
}

/*
 * Winning a won ending: material alone gives every quiet move the same score,
 * so a side 5 kings to 1 up would shuffle until the no-capture draw. The side
 * that's ahead gets a pull toward the enemy pieces and toward trading down.
 */
function endgamePress(b: Board, seat: number, n: number, material: number): number {
  if (Math.abs(material) < 90) return 0;
  const ahead = material > 0 ? seat : 1 - seat;
  const mine: number[] = [];
  const theirs: number[] = [];
  for (let sq = 0; sq < b.length; sq++) {
    const p = b[sq];
    if (!p) continue;
    if (seatOf(p) === ahead) {
      if (isKing(p)) mine.push(sq);
    } else theirs.push(sq);
  }
  if (!theirs.length) return 0;
  let press = 0;
  for (const k of mine) {
    let near = 2 * n;
    for (const t of theirs) {
      const d = Math.max(
        Math.abs(Math.floor(k / n) - Math.floor(t / n)),
        Math.abs((k % n) - (t % n)),
      );
      if (d < near) near = d;
    }
    press += (n - near) * 4;
  }
  // Fewer pieces left for the side behind is closer to a win: trade down.
  press += (20 - theirs.length) * 6;
  return ahead === seat ? press : -press;
}
/** A king or more ahead with the other side down to three pieces or fewer. */
function crushing(b: Board, seat: number): boolean {
  let left = 0;
  for (const p of b) if (p && seatOf(p) !== seat) left++;
  return left <= 3 && evalDraughts(b, seat) >= 150;
}
const draughtsSearch: SearchGame<DP, DMove> = {
  toMove: (p) => p.turn,
  terminal: (p) => (p.quiet >= quietLimit(p.b) ? { winner: null } : null),
  moves: (p) =>
    legalMoves(p.b, p.turn).sort(
      (a, b) => b.caps.length - a.caps.length || Number(b.crowns) - Number(a.crowns),
    ),
  stuck: (p) => ({ winner: 1 - p.turn }),
  play: (p, m) => ({
    b: applyDMove(p.b, m),
    turn: (1 - p.turn) as DSeat,
    quiet: nextQuiet(p.b, m, p.quiet),
  }),
  evaluate: (p, seat) => evalDraughts(p.b, seat),
  tactical: (p) => {
    const ms = legalMoves(p.b, p.turn);
    return ms.length && ms[0]!.caps.length ? ms : [];
  },
};
export const draughtsBot = (s: DraughtsBoard, level: BotLevel, rng: Rng) => {
  if (draughtsResult(s) !== undefined) throw new Error("no legal moves");
  return choose(
    draughtsSearch,
    { b: s.board, turn: s.turn, quiet: s.quiet },
    s.turn,
    level,
    rng,
    // Once it's clearly won, every level plays to finish rather than loosely.
    crushing(s.board, s.turn) ? { easy: 4, medium: 2, hard: 0 } : { easy: 40, medium: 12, hard: 0 },
    6,
  ).path;
};
