/**
 * Game engines are pure functions shared by the server (authoritative) and
 * unit tests. Public state goes to games.state (both partners can read it);
 * secrets go to game_secrets (server only) until it's fair to reveal them.
 */
export type GameType =
  | "know_me"
  | "draw_guess"
  | "trivia"
  | "wyr"
  | "word"
  | "story"
  | "rps"
  | "snap"
  | "zoom"
  | "memory";

export interface Players {
  a: string; // partner A user id
  b: string; // partner B user id
  starter: string; // who created the game
}

export interface EngineResult<S, X> {
  state: S;
  secrets: X;
  finished?: boolean;
  winnerId?: string | null;
  isDraw?: boolean;
  turn?: string | null; // whose turn it is (turn-based) or null for simultaneous
  notifyTurn?: string | null; // user to push "your turn" to
  scores?: Record<string, number>;
}

export class MoveError extends Error {}

export function other(p: Players, id: string): string {
  return id === p.a ? p.b : p.a;
}

/** Deterministic shuffle for reproducible tests. */
export function shuffle<T>(arr: T[], rand: () => number = Math.random): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

export function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
