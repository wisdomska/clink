import { matchGuess } from "./guess-match";
import { MoveError, other, shuffle, type EngineResult, type Players } from "./types";

/* ---------------------------------------------------------------------------
 * Draw and Guess (PLAY-03). 3 rounds; each round both partners draw once.
 * 60 s per turn. The guesser earns more for guessing faster; the drawer earns
 * half of that. Strokes travel over the couple channel (batched every 50 ms).
 * ------------------------------------------------------------------------- */
export const TURN_SECONDS = 60;
export const DRAW_ROUNDS = 3;

export interface DrawState {
  turn: number; // 0..(2*rounds - 1)
  drawer: string;
  turnStartedAt: string;
  lengths: number[]; // word length hint per turn
  results: Array<{ drawer: string; guessed: boolean; seconds: number | null; word: string }>;
  scores: Record<string, number>;
}
export interface DrawSecrets {
  words: string[];
}

export function drawInit(
  p: Players,
  words: string[],
  now = new Date(),
  rand: () => number = Math.random,
): EngineResult<DrawState, DrawSecrets> {
  const picks = shuffle(words, rand).slice(0, DRAW_ROUNDS * 2);
  if (picks.length < DRAW_ROUNDS * 2) throw new MoveError("Not enough words.");
  return {
    state: {
      turn: 0,
      drawer: p.starter,
      turnStartedAt: now.toISOString(),
      lengths: picks.map((w) => w.length),
      results: [],
      scores: { [p.a]: 0, [p.b]: 0 },
    },
    secrets: { words: picks },
    turn: p.starter,
  };
}

export function normaliseGuess(g: string): string {
  return g
    .trim()
    .toLowerCase()
    .replace(/[^a-z ]/g, "")
    .replace(/\s+/g, " ");
}

export function drawMove(
  p: Players,
  s: DrawState,
  x: DrawSecrets,
  userId: string,
  move: { guess?: string; timeout?: boolean },
  now = new Date(),
): EngineResult<DrawState, DrawSecrets> & { correct?: boolean } {
  if (s.results.length >= DRAW_ROUNDS * 2) throw new MoveError("The game is over.");
  const word = x.words[s.turn]!;
  const elapsed = (now.getTime() - new Date(s.turnStartedAt).getTime()) / 1000;
  const expired = elapsed >= TURN_SECONDS + 2;
  let guessed = false;
  if (move.timeout) {
    if (!expired) throw new MoveError("There's still time.");
  } else {
    if (userId === s.drawer) throw new MoveError("You're drawing this one.");
    if (expired) throw new MoveError("Time's up.");
    // Close counts: typos, plurals, filler words and common synonyms (guess-match).
    if (!matchGuess(move.guess ?? "", word)) return { state: s, secrets: x, correct: false };
    guessed = true;
  }
  const seconds = guessed ? Math.round(elapsed) : null;
  const scores = { ...s.scores };
  if (guessed) {
    const pts = Math.max(10, Math.round(100 - (elapsed / TURN_SECONDS) * 90));
    const guesser = other(p, s.drawer);
    scores[guesser] = (scores[guesser] ?? 0) + pts;
    scores[s.drawer] = (scores[s.drawer] ?? 0) + Math.round(pts / 2);
  }
  const results = [...s.results, { drawer: s.drawer, guessed, seconds, word }];
  const done = results.length === DRAW_ROUNDS * 2;
  const nextDrawer = other(p, s.drawer);
  const sa = scores[p.a] ?? 0;
  const sb = scores[p.b] ?? 0;
  return {
    state: {
      ...s,
      results,
      scores,
      turn: done ? s.turn : s.turn + 1,
      drawer: done ? s.drawer : nextDrawer,
      turnStartedAt: now.toISOString(),
    },
    secrets: x,
    correct: guessed,
    finished: done,
    winnerId: done ? (sa === sb ? null : sa > sb ? p.a : p.b) : undefined,
    isDraw: done && sa === sb,
    turn: done ? null : nextDrawer,
    scores,
  };
}

/* ---------------------------------------------------------------------------
 * Word board (PLAY-06, turn-based). A shared 4x4 letter board. Take turns
 * playing a word traced through touching tiles. Longer words score more.
 * 8 turns each, or both pass in a row. Survives days; push on your turn.
 * ------------------------------------------------------------------------- */
const DICE = [
  "AAEEGN",
  "ABBJOO",
  "ACHOPS",
  "AFFKPS",
  "AOOTTW",
  "CIMOTU",
  "DEILRX",
  "DELRVY",
  "DISTTY",
  "EEGHNW",
  "EEINSU",
  "EHRTVW",
  "EIOSST",
  "ELRTTY",
  "HIMNQU",
  "HLNNRZ",
];
export const WORD_TURNS_EACH = 8;

export interface WordState {
  board: string[]; // 16 tiles, "QU" counts as one tile
  turn: string;
  plays: Array<{ by: string; word: string | null; points: number; at: string }>;
  scores: Record<string, number>;
}

export function wordInit(
  p: Players,
  rand: () => number = Math.random,
): EngineResult<WordState, Record<string, never>> {
  const board = shuffle(DICE, rand).map((d) => {
    const f = d[Math.floor(rand() * 6)]!;
    return f === "Q" ? "QU" : f;
  });
  return {
    state: { board, turn: p.starter, plays: [], scores: { [p.a]: 0, [p.b]: 0 } },
    secrets: {},
    turn: p.starter,
    notifyTurn: null,
  };
}

export function wordPoints(word: string): number {
  const n = word.length;
  if (n <= 2) return 0;
  if (n <= 4) return n - 2;
  if (n === 5) return 4;
  if (n === 6) return 6;
  if (n === 7) return 9;
  return 11 + (n - 8) * 2;
}

/** Can `word` be traced on the 4x4 board through touching, unrepeated tiles? */
export function traceable(board: string[], word: string): boolean {
  const w = word.toUpperCase();
  const neighbours = (i: number) => {
    const r = Math.floor(i / 4);
    const c = i % 4;
    const out: number[] = [];
    for (let dr = -1; dr <= 1; dr++)
      for (let dc = -1; dc <= 1; dc++) {
        if (!dr && !dc) continue;
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < 4 && nc >= 0 && nc < 4) out.push(nr * 4 + nc);
      }
    return out;
  };
  const dfs = (i: number, pos: number, used: Set<number>): boolean => {
    const tile = board[i]!;
    if (!w.startsWith(tile, pos)) return false;
    const next = pos + tile.length;
    if (next === w.length) return true;
    used.add(i);
    for (const n of neighbours(i)) if (!used.has(n) && dfs(n, next, used)) return true;
    used.delete(i);
    return false;
  };
  return board.some((_, i) => dfs(i, 0, new Set()));
}

export function wordMove(
  p: Players,
  s: WordState,
  userId: string,
  move: { word?: string; pass?: boolean },
  isWord: (w: string) => boolean,
  now = new Date(),
): EngineResult<WordState, Record<string, never>> {
  if (s.plays.length >= WORD_TURNS_EACH * 2) throw new MoveError("The game is over.");
  if (userId !== s.turn) throw new MoveError("It's their turn.");
  let word: string | null = null;
  let points = 0;
  if (!move.pass) {
    word = (move.word ?? "").trim().toLowerCase();
    if (!/^[a-z]{3,16}$/.test(word)) throw new MoveError("Words need 3 letters or more.");
    if (s.plays.some((pl) => pl.word === word)) throw new MoveError("That one's been played.");
    if (!traceable(s.board, word)) throw new MoveError("That word isn't on the board.");
    if (!isWord(word)) throw new MoveError("That's not in our dictionary.");
    points = wordPoints(word);
  }
  const plays = [...s.plays, { by: userId, word, points, at: now.toISOString() }];
  const scores = { ...s.scores, [userId]: (s.scores[userId] ?? 0) + points };
  const lastTwoPassed = plays.length >= 2 && plays.slice(-2).every((pl) => pl.word === null);
  const done = plays.length >= WORD_TURNS_EACH * 2 || lastTwoPassed;
  const next = other(p, userId);
  const sa = scores[p.a] ?? 0;
  const sb = scores[p.b] ?? 0;
  return {
    state: { ...s, plays, scores, turn: done ? s.turn : next },
    secrets: {},
    finished: done,
    winnerId: done ? (sa === sb ? null : sa > sb ? p.a : p.b) : undefined,
    isDraw: done && sa === sb,
    turn: done ? null : next,
    notifyTurn: done ? null : next,
    scores,
  };
}

/* ---------------------------------------------------------------------------
 * Story builder (PLAY-07, turn-based). Alternate lines, up to 40.
 * ------------------------------------------------------------------------- */
export const STORY_MAX_LINES = 40;
export interface StoryState {
  starter: string; // opening line text
  lines: Array<{ by: string; text: string; at: string }>;
  turn: string;
  ended: boolean;
}

export function storyInit(
  p: Players,
  opening: string,
): EngineResult<StoryState, Record<string, never>> {
  return {
    state: { starter: opening, lines: [], turn: p.starter, ended: false },
    secrets: {},
    turn: p.starter,
  };
}

export function storyMove(
  p: Players,
  s: StoryState,
  userId: string,
  move: { line?: string; end?: boolean },
  now = new Date(),
): EngineResult<StoryState, Record<string, never>> {
  if (s.ended || s.lines.length >= STORY_MAX_LINES) throw new MoveError("This story is finished.");
  if (move.end) {
    if (s.lines.length < 4) throw new MoveError("Give it at least four lines first.");
    return {
      state: { ...s, ended: true },
      secrets: {},
      finished: true,
      winnerId: null,
      isDraw: true,
      turn: null,
    };
  }
  if (userId !== s.turn) throw new MoveError("It's their line.");
  const text = (move.line ?? "").trim().replace(/\s+/g, " ");
  if (text.length < 2 || text.length > 160) throw new MoveError("One line, up to 160 characters.");
  const lines = [...s.lines, { by: userId, text, at: now.toISOString() }];
  const done = lines.length >= STORY_MAX_LINES;
  const next = other(p, userId);
  return {
    state: { ...s, lines, turn: next, ended: done },
    secrets: {},
    finished: done,
    winnerId: null,
    isDraw: done,
    turn: done ? null : next,
    notifyTurn: done ? null : next,
  };
}
