import { MoveError, other, shuffle, type EngineResult, type Players } from "./types";

/* ---------------------------------------------------------------------------
 * Rock paper scissors. First to 3 wins. Throws are sealed until both are in.
 * ------------------------------------------------------------------------- */
export type Throw = "rock" | "paper" | "scissors";
const BEATS: Record<Throw, Throw> = { rock: "scissors", paper: "rock", scissors: "paper" };
export const RPS_TARGET = 3;

export interface RpsState {
  submitted: string[];
  rounds: Array<{ picks: Record<string, Throw>; winner: string | null }>;
  scores: Record<string, number>;
}
export interface RpsSecrets {
  pending: Record<string, Throw>;
}

export function rpsInit(p: Players): EngineResult<RpsState, RpsSecrets> {
  return {
    state: { submitted: [], rounds: [], scores: { [p.a]: 0, [p.b]: 0 } },
    secrets: { pending: {} },
    turn: null,
  };
}

export function rpsMove(
  p: Players,
  s: RpsState,
  x: RpsSecrets,
  userId: string,
  move: { pick: Throw },
): EngineResult<RpsState, RpsSecrets> {
  if (!(move.pick in BEATS)) throw new MoveError("Rock, paper or scissors.");
  if (s.submitted.includes(userId)) throw new MoveError("You've thrown already.");
  const pending = { ...x.pending, [userId]: move.pick };
  const submitted = [...s.submitted, userId];
  if (submitted.length < 2) return { state: { ...s, submitted }, secrets: { pending } };
  const me = pending[p.a]!;
  const them = pending[p.b]!;
  const winner = me === them ? null : BEATS[me] === them ? p.a : p.b;
  const scores = { ...s.scores };
  if (winner) scores[winner] = (scores[winner] ?? 0) + 1;
  const champ = Object.entries(scores).find(([, v]) => v >= RPS_TARGET)?.[0];
  return {
    state: { submitted: [], rounds: [...s.rounds, { picks: pending, winner }], scores },
    secrets: { pending: {} },
    finished: Boolean(champ),
    winnerId: champ ?? undefined,
    scores,
  };
}

/* ---------------------------------------------------------------------------
 * Snap challenge. 3 prompts. You both shoot a photo for each (sealed until
 * both are in), then each picks the better one. Agree on a photo and it
 * scores; each pick the other's and you both score.
 * ------------------------------------------------------------------------- */
export interface SnapState {
  prompts: string[];
  index: number;
  phase: "shoot" | "vote";
  submitted: string[];
  shots: Array<Record<string, string>>; // per revealed round: user -> media id
  votes: Array<Record<string, string>>; // per round: voter -> chosen user
  scores: Record<string, number>;
}
export interface SnapSecrets {
  pending: Record<string, string>;
}

export function snapInit(p: Players, prompts: string[]): EngineResult<SnapState, SnapSecrets> {
  if (prompts.length < 3) throw new MoveError("Not enough prompts.");
  return {
    state: {
      prompts: prompts.slice(0, 3),
      index: 0,
      phase: "shoot",
      submitted: [],
      shots: [],
      votes: [],
      scores: { [p.a]: 0, [p.b]: 0 },
    },
    secrets: { pending: {} },
    turn: null,
  };
}

export function snapMove(
  p: Players,
  s: SnapState,
  x: SnapSecrets,
  userId: string,
  move: { mediaId?: string; vote?: string },
): EngineResult<SnapState, SnapSecrets> {
  if (s.submitted.includes(userId)) throw new MoveError("Waiting on them.");
  const submitted = [...s.submitted, userId];
  if (s.phase === "shoot") {
    if (typeof move.mediaId !== "string") throw new MoveError("Take a photo first.");
    const pending = { ...x.pending, [userId]: move.mediaId };
    if (submitted.length < 2) return { state: { ...s, submitted }, secrets: { pending } };
    return {
      state: { ...s, phase: "vote", submitted: [], shots: [...s.shots, pending] },
      secrets: { pending: {} },
    };
  }
  if (move.vote !== p.a && move.vote !== p.b) throw new MoveError("Pick one of the two.");
  const round = { ...(s.votes[s.index] ?? {}), [userId]: move.vote };
  const votes = [...s.votes.slice(0, s.index), round];
  if (submitted.length < 2) return { state: { ...s, submitted, votes }, secrets: x };
  const scores = { ...s.scores };
  const va = round[p.a]!;
  const vb = round[p.b]!;
  if (va === vb) scores[va] = (scores[va] ?? 0) + 1;
  else if (va === p.b && vb === p.a) {
    scores[p.a] = (scores[p.a] ?? 0) + 1;
    scores[p.b] = (scores[p.b] ?? 0) + 1;
  }
  const done = s.index + 1 >= s.prompts.length;
  const winner = scores[p.a]! === scores[p.b]! ? null : scores[p.a]! > scores[p.b]! ? p.a : p.b;
  return {
    state: {
      ...s,
      votes,
      scores,
      submitted: [],
      phase: "shoot",
      index: done ? s.index : s.index + 1,
    },
    secrets: { pending: {} },
    finished: done,
    winnerId: done ? winner : undefined,
    isDraw: done && winner === null,
    scores,
  };
}

/* ---------------------------------------------------------------------------
 * Zoom guess. Two rounds, one each: the setter picks a photo and says what it
 * is; the guesser sees it zoomed right in. Each wrong guess zooms out a step.
 * Points: 5 for a first-look guess, down to 1 at the widest view.
 * ------------------------------------------------------------------------- */
export const ZOOM_LEVELS = [8, 5, 3, 2, 1.25] as const;

export interface ZoomRound {
  setter: string;
  mediaId: string | null;
  focus: { x: number; y: number } | null;
  level: number;
  guesses: string[];
  solved: boolean | null; // null while playing
  answer?: string; // revealed when the round ends
}
export interface ZoomState {
  rounds: ZoomRound[];
  index: number;
  scores: Record<string, number>;
}
export interface ZoomSecrets {
  answer?: string;
}

export function zoomInit(p: Players): EngineResult<ZoomState, ZoomSecrets> {
  const first = p.starter;
  const mk = (setter: string): ZoomRound => ({
    setter,
    mediaId: null,
    focus: null,
    level: 0,
    guesses: [],
    solved: null,
  });
  return {
    state: { rounds: [mk(first), mk(other(p, first))], index: 0, scores: { [p.a]: 0, [p.b]: 0 } },
    secrets: {},
    turn: null,
  };
}

export function normalise(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\b(a|an|the|my|our|your|some)\b/g, " ")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function distance(a: string, b: string) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0]![j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i]![j] = Math.min(
        d[i - 1]![j]! + 1,
        d[i]![j - 1]! + 1,
        d[i - 1]![j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
  return d[a.length]![b.length]!;
}

/** Forgiving match: ignores case, accents, articles; allows a small typo or a plural. */
export function closeEnough(guess: string, answer: string) {
  const g = normalise(guess);
  const a = normalise(answer);
  if (!g || !a) return false;
  if (g === a || g.replace(/s$/, "") === a.replace(/s$/, "")) return true;
  if (a.split(" ").length > 1 && a.split(" ").includes(g) && g.length >= 4) return true;
  return distance(g, a) <= (a.length >= 8 ? 2 : a.length >= 4 ? 1 : 0);
}

export function zoomMove(
  p: Players,
  s: ZoomState,
  x: ZoomSecrets,
  userId: string,
  move: { mediaId?: string; answer?: string; focus?: { x: number; y: number }; guess?: string },
): EngineResult<ZoomState, ZoomSecrets> & { hit?: boolean } {
  const r = s.rounds[s.index]!;
  const rounds = s.rounds.slice();
  if (!r.mediaId) {
    if (userId !== r.setter) throw new MoveError("They're choosing a photo.");
    const answer = String(move.answer ?? "").trim();
    if (typeof move.mediaId !== "string") throw new MoveError("Pick a photo.");
    if (answer.length < 2 || answer.length > 40)
      throw new MoveError("Say what it is in a few words.");
    const fx = Number(move.focus?.x);
    const fy = Number(move.focus?.y);
    const focus = {
      x: Number.isFinite(fx) ? Math.min(0.85, Math.max(0.15, fx)) : 0.5,
      y: Number.isFinite(fy) ? Math.min(0.85, Math.max(0.15, fy)) : 0.5,
    };
    rounds[s.index] = { ...r, mediaId: move.mediaId, focus };
    return { state: { ...s, rounds }, secrets: { answer } };
  }
  if (userId === r.setter) throw new MoveError("You know this one.");
  const guess = String(move.guess ?? "")
    .trim()
    .slice(0, 40);
  if (!guess) throw new MoveError("Type a guess.");
  const right = closeEnough(guess, x.answer ?? "");
  const guesses = [...r.guesses, guess];
  const last = r.level >= ZOOM_LEVELS.length - 1;
  const scores = { ...s.scores };
  if (!right && !last) {
    rounds[s.index] = { ...r, guesses, level: r.level + 1 };
    return { state: { ...s, rounds }, secrets: x, hit: false };
  }
  if (right) scores[userId] = (scores[userId] ?? 0) + (ZOOM_LEVELS.length - r.level);
  rounds[s.index] = { ...r, guesses, solved: right, answer: x.answer };
  const done = s.index + 1 >= s.rounds.length;
  const winner = scores[p.a]! === scores[p.b]! ? null : scores[p.a]! > scores[p.b]! ? p.a : p.b;
  return {
    state: { ...s, rounds, scores, index: done ? s.index : s.index + 1 },
    secrets: {},
    hit: right,
    finished: done,
    winnerId: done ? winner : undefined,
    isDraw: done && winner === null,
    scores,
  };
}

/* ---------------------------------------------------------------------------
 * Photo memory. 12 cards, 6 pairs, drawn from your own shared photos (topped
 * up with 3D art). Take turns flipping two; a match scores and goes again.
 * The layout stays on the server; only flipped cards are revealed.
 * ------------------------------------------------------------------------- */
export interface MemoryCard {
  kind: "media" | "art";
  ref: string;
}
export interface MemoryState {
  size: number;
  turn: string;
  open: number[]; // currently face-up, unmatched (0..2)
  faces: Record<number, MemoryCard>; // revealed faces (open or matched)
  matched: Record<number, string>; // index -> who matched it
  scores: Record<string, number>;
  last: { by: string; a: number; b: number; match: boolean } | null;
}
export interface MemorySecrets {
  layout: MemoryCard[];
}

export function memoryInit(
  p: Players,
  pool: MemoryCard[],
  rand: () => number = Math.random,
): EngineResult<MemoryState, MemorySecrets> {
  const pairs = pool.slice(0, 6);
  if (pairs.length < 6) throw new MoveError("Not enough pictures.");
  const layout = shuffle([...pairs, ...pairs], rand);
  const first = other(p, p.starter); // the invited partner starts
  return {
    state: {
      size: layout.length,
      turn: first,
      open: [],
      faces: {},
      matched: {},
      scores: { [p.a]: 0, [p.b]: 0 },
      last: null,
    },
    secrets: { layout },
    turn: first,
  };
}

export function memoryMove(
  p: Players,
  s: MemoryState,
  x: MemorySecrets,
  userId: string,
  move: { flip: number },
): EngineResult<MemoryState, MemorySecrets> {
  if (userId !== s.turn) throw new MoveError("It's their turn.");
  const i = move.flip;
  if (!Number.isInteger(i) || i < 0 || i >= s.size) throw new MoveError("Pick a card.");
  if (s.matched[i] || (s.open.length < 2 && s.open.includes(i)))
    throw new MoveError("That one's already up.");
  // A new turn starts by turning the last mismatched pair back over.
  const base = s.open.length >= 2 ? [] : s.open;
  const faces = { ...s.faces };
  if (s.open.length >= 2) for (const k of s.open) if (!s.matched[k]) delete faces[k];
  faces[i] = x.layout[i]!;
  const open = [...base, i];
  if (open.length < 2) return { state: { ...s, faces, open }, secrets: x, turn: s.turn };
  const [a, b] = open as [number, number];
  const match = x.layout[a]!.ref === x.layout[b]!.ref && x.layout[a]!.kind === x.layout[b]!.kind;
  const matched = { ...s.matched };
  const scores = { ...s.scores };
  if (match) {
    matched[a] = userId;
    matched[b] = userId;
    scores[userId] = (scores[userId] ?? 0) + 1;
  }
  const done = Object.keys(matched).length >= s.size;
  const turn = match ? userId : other(p, userId);
  const winner = scores[p.a]! === scores[p.b]! ? null : scores[p.a]! > scores[p.b]! ? p.a : p.b;
  return {
    state: {
      ...s,
      faces,
      matched,
      scores,
      open: match ? [] : open,
      turn,
      last: { by: userId, a, b, match },
    },
    secrets: x,
    turn,
    finished: done,
    winnerId: done ? winner : undefined,
    isDraw: done && winner === null,
    scores,
  };
}
