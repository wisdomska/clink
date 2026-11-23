/**
 * Four Up (four in a row): 7 columns by 6 rows, cells row-major with row 0 at
 * the top. 0 empty, 1 seat 0, 2 seat 1. Discs drop to the lowest empty cell.
 * Four in a line in any direction wins; a full board draws. Ported from SPUZL (wisdomska).
 */
export const COLS = 7;
export const ROWS = 6;
export type Grid = number[];
export type Seat = 0 | 1;

export interface FourUpBoard {
  grid: Grid;
  /** columns played, in order */
  moves: number[];
}

export const fourupStart = (): FourUpBoard => ({ grid: new Array(COLS * ROWS).fill(0), moves: [] });
export const fourupTurn = (s: FourUpBoard): Seat => (s.moves.length % 2) as Seat;

export function dropRow(g: Grid, col: number): number {
  if (!Number.isInteger(col) || col < 0 || col >= COLS) return -1;
  for (let r = ROWS - 1; r >= 0; r--) if (!g[r * COLS + col]) return r;
  return -1;
}

export function openCols(g: Grid): number[] {
  const out: number[] = [];
  for (let c = 0; c < COLS; c++) if (!g[c]) out.push(c);
  return out;
}

const DIRS = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
] as const;

/** The line of four or more through `cell`, or null. */
export function lineThrough(g: Grid, cell: number): number[] | null {
  const who = g[cell];
  if (!who) return null;
  const r0 = Math.floor(cell / COLS);
  const c0 = cell % COLS;
  for (const [dr, dc] of DIRS) {
    const line = [cell];
    for (const s of [1, -1]) {
      let r = r0 + dr * s;
      let c = c0 + dc * s;
      while (r >= 0 && r < ROWS && c >= 0 && c < COLS && g[r * COLS + c] === who) {
        line.push(r * COLS + c);
        r += dr * s;
        c += dc * s;
      }
    }
    if (line.length >= 4) return line.sort((a, b) => a - b);
  }
  return null;
}

export function fourupWinner(s: FourUpBoard): { seat: Seat; line: number[] } | null {
  for (let i = 0; i < s.grid.length; i++) {
    const l = s.grid[i] ? lineThrough(s.grid, i) : null;
    if (l) return { seat: (s.grid[i]! - 1) as Seat, line: l };
  }
  return null;
}

export const fourupOver = (s: FourUpBoard) =>
  fourupWinner(s) !== null || openCols(s.grid).length === 0;

export function fourupPlay(s: FourUpBoard, seat: Seat, col: number): FourUpBoard {
  if (fourupOver(s)) throw new Error("The game is over.");
  if (seat !== fourupTurn(s)) throw new Error("It's not your turn.");
  const r = dropRow(s.grid, col);
  if (r < 0) throw new Error("That column is full.");
  const grid = s.grid.slice();
  grid[r * COLS + col] = seat + 1;
  return { grid, moves: [...s.moves, col] };
}

/** Would dropping in `col` for `who` (1 or 2) make four? */
export function dropWins(g: Grid, col: number, who: number): boolean {
  const r = dropRow(g, col);
  if (r < 0) return false;
  const n = g.slice();
  n[r * COLS + col] = who;
  return lineThrough(n, r * COLS + col) !== null;
}
