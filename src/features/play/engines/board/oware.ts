/**
 * Oware, Abapa rules (the Ghanaian standard). Ported from SPUZL (wisdomska).
 *
 * Pits 0..5 belong to seat 0 (bottom row, left to right), 6..11 to seat 1 (top
 * row, right to left), so sowing anticlockwise is increasing index. 4 seeds a
 * pit, 48 in all.
 * - Sow every seed from one of your pits, one per pit anticlockwise. A pit of
 *   12 or more laps the board and skips the pit it came from.
 * - If the last seed lands in a rival pit that now holds 2 or 3, capture it,
 *   then keep capturing the pits before it on the rival side while they hold 2 or 3.
 * - Grand slam: a move that would capture every seed on the rival side is
 *   played but captures nothing.
 * - You must feed a rival whose side is empty if any move can. If none can,
 *   the game ends and you take the seeds on your own side.
 * - 25 seeds wins; 24 each is a draw. 100 plies without a capture ends the
 *   game and each side takes its own seeds.
 */
export type Seat = 0 | 1;
export const PITS = 12;
export const CYCLE_LIMIT = 100;
export const TOP_ROW = [11, 10, 9, 8, 7, 6];
export const BOTTOM_ROW = [0, 1, 2, 3, 4, 5];

export const sideOf = (pit: number): Seat => (pit < 6 ? 0 : 1);
export const sideSeeds = (pits: readonly number[], seat: Seat) =>
  pits.slice(seat * 6, seat * 6 + 6).reduce((a, b) => a + b, 0);

export interface SowResult {
  pits: number[];
  /** pits that received a seed, in order */
  path: number[];
  last: number;
  captured: number[];
  gain: number;
  grandSlam: boolean;
}

export function sow(pits: readonly number[], pit: number): SowResult {
  const out = pits.slice();
  let seeds = out[pit]!;
  out[pit] = 0;
  const path: number[] = [];
  let i = pit;
  while (seeds > 0) {
    i = (i + 1) % PITS;
    if (i === pit) continue;
    out[i] = out[i]! + 1;
    path.push(i);
    seeds--;
  }
  const me = sideOf(pit);
  const captured: number[] = [];
  let k = i;
  while (sideOf(k) !== me && (out[k] === 2 || out[k] === 3)) {
    captured.push(k);
    if (k % 6 === 0) break;
    k--;
  }
  const gain = captured.reduce((s, p) => s + out[p]!, 0);
  const rival = (1 - me) as Seat;
  const grandSlam = captured.length > 0 && gain === sideSeeds(out, rival);
  if (!grandSlam) for (const p of captured) out[p] = 0;
  return {
    pits: out,
    path,
    last: i,
    captured: grandSlam ? [] : captured,
    gain: grandSlam ? 0 : gain,
    grandSlam,
  };
}

/** Legal pits for `seat`, honouring the must-feed rule. */
export function legalPits(pits: readonly number[], seat: Seat): number[] {
  const mine = Array.from({ length: 6 }, (_, k) => seat * 6 + k).filter((p) => pits[p]! > 0);
  const rival = (1 - seat) as Seat;
  if (sideSeeds(pits, rival) > 0) return mine;
  return mine.filter((p) => sideSeeds(sow(pits, p).pits, rival) > 0);
}

export interface OwareBoard {
  pits: number[];
  scores: [number, number];
  turn: Seat;
  quiet: number;
  over: boolean;
  reason?: string;
  /** pits played, in order */
  history: number[];
}

export const owareStart = (): OwareBoard => ({
  pits: new Array(12).fill(4),
  scores: [0, 0],
  turn: 0,
  quiet: 0,
  over: false,
  history: [],
});

function collect(s: OwareBoard, reason: string): OwareBoard {
  return {
    ...s,
    over: true,
    reason,
    pits: new Array(12).fill(0),
    scores: [s.scores[0] + sideSeeds(s.pits, 0), s.scores[1] + sideSeeds(s.pits, 1)],
  };
}

/** End-of-game checks after a move. */
export function owareSettle(s: OwareBoard): OwareBoard {
  if (s.over) return s;
  const [a, b] = s.scores;
  if (a >= 25 || b >= 25 || (a === 24 && b === 24)) return { ...s, over: true, reason: "score" };
  if (!legalPits(s.pits, s.turn).length) return collect(s, "no moves");
  if (s.quiet >= CYCLE_LIMIT) return collect(s, "cycle");
  return s;
}

export function owarePlay(s: OwareBoard, seat: Seat, pit: number): OwareBoard {
  if (s.over) throw new Error("The game is over.");
  if (seat !== s.turn) throw new Error("It's not your turn.");
  if (!legalPits(s.pits, seat).includes(pit)) throw new Error("You can't play that pit.");
  const r = sow(s.pits, pit);
  const scores: [number, number] = [s.scores[0], s.scores[1]];
  scores[seat] += r.gain;
  return owareSettle({
    pits: r.pits,
    scores,
    turn: (1 - seat) as Seat,
    quiet: r.gain ? 0 : s.quiet + 1,
    over: false,
    history: [...s.history, pit],
  });
}

/** Winner seat, null for a draw, undefined while playing. */
export function owareWinner(s: OwareBoard): Seat | null | undefined {
  if (!s.over) return undefined;
  const [a, b] = s.scores;
  return a === b ? null : a > b ? 0 : 1;
}
