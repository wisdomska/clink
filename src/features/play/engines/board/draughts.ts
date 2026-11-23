/**
 * Draughts in two sizes; the board's length says which rules apply. Ported from SPUZL (wisdomska).
 *
 * International, 10 x 10 (the default, played across Africa): men move forward
 * one square and capture forward and backward; kings fly any distance; captures
 * are compulsory and you must take the line that captures the most; captured
 * pieces come off when the move ends; a man is crowned only when it ends on the far row.
 *
 * English, 8 x 8: men move and capture forward only; kings one square any
 * direction; captures compulsory but any line may be chosen; a man reaching the
 * far row is crowned and the move ends there.
 *
 * Pieces sit on dark squares ((row + col) odd), row 0 at the top. Seat 0 starts
 * at the bottom, moves up and goes first. No legal move loses.
 */
export const EMPTY = 0;
export const MAN0 = 1;
export const KING0 = 2;
export const MAN1 = 3;
export const KING1 = 4;
export type Seat = 0 | 1;
export type Board = number[];
export type DraughtsSize = 8 | 10;

export interface DMove {
  /** squares visited: start, then each landing */
  path: number[];
  caps: number[];
  crowns: boolean;
}

export const sizeOf = (b: readonly number[]): DraughtsSize => (b.length === 100 ? 10 : 8);
export const seatOf = (p: number): Seat => (p >= MAN1 ? 1 : 0);
export const isKing = (p: number) => p === KING0 || p === KING1;
export const isDark = (sq: number, n: number) => (Math.floor(sq / n) + (sq % n)) % 2 === 1;
const DIAG: ReadonlyArray<readonly [number, number]> = [
  [-1, -1],
  [-1, 1],
  [1, -1],
  [1, 1],
];
const forward = (s: Seat) => (s === 0 ? DIAG.slice(0, 2) : DIAG.slice(2));
const crownRow = (s: Seat, n: number) => (s === 0 ? 0 : n - 1);

export function initialBoard(n: DraughtsSize = 10): Board {
  const b: Board = new Array(n * n).fill(EMPTY);
  const rows = n === 10 ? 4 : 3;
  for (let sq = 0; sq < n * n; sq++) {
    if (!isDark(sq, n)) continue;
    const r = Math.floor(sq / n);
    if (r < rows) b[sq] = MAN1;
    else if (r >= n - rows) b[sq] = MAN0;
  }
  return b;
}

function capturesFrom(b: Board, from: number): DMove[] {
  const p = b[from]!;
  if (!p) return [];
  const n = sizeOf(b);
  const intl = n === 10;
  const me = seatOf(p);
  const king = isKing(p);
  const on = (r: number, c: number) => r >= 0 && r < n && c >= 0 && c < n;
  const at = (r: number, c: number) => work[r * n + c]!;
  const out: DMove[] = [];
  const work = b.slice();
  work[from] = EMPTY;
  const dirs = king || intl ? DIAG : forward(me);
  const rec = (sq: number, path: number[], caps: number[]) => {
    const r = Math.floor(sq / n);
    const c = sq % n;
    let extended = false;
    for (const [dr, dc] of dirs) {
      if (king && intl) {
        let k = 1;
        while (on(r + k * dr, c + k * dc) && at(r + k * dr, c + k * dc) === EMPTY) k++;
        if (!on(r + k * dr, c + k * dc)) continue;
        const mid = (r + k * dr) * n + c + k * dc;
        const m = work[mid]!;
        if (seatOf(m) === me || caps.includes(mid)) continue;
        for (let j = k + 1; on(r + j * dr, c + j * dc); j++) {
          const land = (r + j * dr) * n + c + j * dc;
          if (work[land] !== EMPTY) break;
          extended = true;
          rec(land, [...path, land], [...caps, mid]);
        }
        continue;
      }
      if (!on(r + 2 * dr, c + 2 * dc)) continue;
      const mid = (r + dr) * n + c + dc;
      const land = (r + 2 * dr) * n + c + 2 * dc;
      const m = work[mid]!;
      if (!m || seatOf(m) === me || caps.includes(mid) || work[land] !== EMPTY) continue;
      extended = true;
      const np = [...path, land];
      const nc = [...caps, mid];
      if (!king && !intl && Math.floor(land / n) === crownRow(me, n))
        out.push({ path: np, caps: nc, crowns: true });
      else rec(land, np, nc);
    }
    if (!extended && caps.length)
      out.push({
        path,
        caps,
        crowns: !king && Math.floor(path[path.length - 1]! / n) === crownRow(me, n),
      });
  };
  rec(from, [from], []);
  return out;
}

function simpleFrom(b: Board, from: number): DMove[] {
  const p = b[from]!;
  if (!p) return [];
  const n = sizeOf(b);
  const intl = n === 10;
  const me = seatOf(p);
  const king = isKing(p);
  const on = (r: number, c: number) => r >= 0 && r < n && c >= 0 && c < n;
  const r = Math.floor(from / n);
  const c = from % n;
  const out: DMove[] = [];
  for (const [dr, dc] of king ? DIAG : forward(me)) {
    for (let k = 1; on(r + k * dr, c + k * dc); k++) {
      const to = (r + k * dr) * n + c + k * dc;
      if (b[to] !== EMPTY) break;
      out.push({
        path: [from, to],
        caps: [],
        crowns: !king && Math.floor(to / n) === crownRow(me, n),
      });
      if (!(king && intl)) break;
    }
  }
  return out;
}

/** Captures if any (compulsory; International keeps only the longest), else plain moves. */
export function legalMoves(b: Board, seat: Seat): DMove[] {
  let caps: DMove[] = [];
  for (let sq = 0; sq < b.length; sq++)
    if (b[sq] && seatOf(b[sq]!) === seat) caps.push(...capturesFrom(b, sq));
  if (caps.length) {
    if (sizeOf(b) === 10) {
      const most = Math.max(...caps.map((m) => m.caps.length));
      caps = caps.filter((m) => m.caps.length === most);
    }
    return caps;
  }
  const simple: DMove[] = [];
  for (let sq = 0; sq < b.length; sq++)
    if (b[sq] && seatOf(b[sq]!) === seat) simple.push(...simpleFrom(b, sq));
  return simple;
}

export function applyDMove(b: Board, m: DMove): Board {
  const n = b.slice();
  const p = n[m.path[0]!]!;
  n[m.path[0]!] = EMPTY;
  for (const c of m.caps) n[c] = EMPTY;
  n[m.path[m.path.length - 1]!] = m.crowns ? (seatOf(p) === 0 ? KING0 : KING1) : p;
  return n;
}

const samePath = (a: readonly number[], b: readonly number[]) =>
  a.length === b.length && a.every((x, i) => x === b[i]);

export function findMove(b: Board, seat: Seat, path: unknown): DMove | null {
  const most = sizeOf(b) === 10 ? 21 : 13;
  if (
    !Array.isArray(path) ||
    path.length < 2 ||
    path.length > most ||
    !path.every((x) => Number.isInteger(x) && x >= 0 && x < b.length)
  )
    return null;
  return legalMoves(b, seat).find((m) => samePath(m.path, path as number[])) ?? null;
}

export const countPieces = (b: Board, seat: Seat) =>
  b.filter((p) => p && seatOf(p) === seat).length;

export interface DraughtsBoard {
  board: Board;
  turn: Seat;
  /** plies towards the draw limit */
  quiet: number;
  moves: number[][];
}

/** English: 40 moves each without a capture or crowning. International: 25 each with only kings moving. */
export const quietLimit = (b: Board) => (sizeOf(b) === 10 ? 50 : 80);

export function nextQuiet(b: Board, m: DMove, quiet: number): number {
  if (m.caps.length || m.crowns) return 0;
  if (sizeOf(b) === 10 && !isKing(b[m.path[0]!]!)) return 0;
  return quiet + 1;
}

export const draughtsStart = (n: DraughtsSize = 10): DraughtsBoard => ({
  board: initialBoard(n),
  turn: 0,
  quiet: 0,
  moves: [],
});

/** Winner seat, null for a draw, undefined while playing. */
export function draughtsResult(s: DraughtsBoard): Seat | null | undefined {
  if (!legalMoves(s.board, s.turn).length) return (1 - s.turn) as Seat;
  if (s.quiet >= quietLimit(s.board)) return null;
  return undefined;
}

export function draughtsPlay(s: DraughtsBoard, seat: Seat, path: unknown): DraughtsBoard {
  if (draughtsResult(s) !== undefined) throw new Error("The game is over.");
  if (seat !== s.turn) throw new Error("It's not your turn.");
  const m = findMove(s.board, seat, path);
  if (!m) throw new Error("That move isn't allowed.");
  return {
    board: applyDMove(s.board, m),
    turn: (1 - seat) as Seat,
    quiet: nextQuiet(s.board, m, s.quiet),
    moves: [...s.moves, m.path],
  };
}
