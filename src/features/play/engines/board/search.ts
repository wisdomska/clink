/**
 * The practice bot's thinking: minimax with alpha-beta pruning and iterative
 * deepening inside a time budget, so it answers quickly even on a slow phone
 * (it simply looks less far ahead there). Pure: no React, no DOM.
 * Ported from SPUZL (wisdomska).
 */
import type { Rng } from "./rng";

export interface SearchGame<P, M> {
  toMove(p: P): number;
  /** game over before generating moves: winner seat, or null for a draw */
  terminal(p: P): { winner: number | null } | null;
  /** legal moves, best guesses first */
  moves(p: P): M[];
  /** result when the side to move has no legal move */
  stuck(p: P): { winner: number | null };
  play(p: P, m: M): P;
  /** static score from `seat`'s point of view */
  evaluate(p: P, seat: number): number;
  /** captures only, for a short extra look at the horizon */
  tactical?(p: P): M[];
}

export const WIN = 1_000_000;
const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());
class Timeout extends Error {}

export function searchBest<P, M extends NonNullable<unknown>>(
  g: SearchGame<P, M>,
  root: P,
  seat: number,
  o: { budgetMs: number; maxDepth: number; rng: Rng; qDepth?: number },
): M {
  const deadline = now() + o.budgetMs;
  const qDepth = o.qDepth ?? 0;
  const first = g.moves(root);
  if (!first.length) throw new Error("no legal moves");
  let ordered = first
    .map((m, i) => ({ m, k: i + o.rng.next() * 0.9 }))
    .sort((a, b) => a.k - b.k)
    .map((x) => x.m);
  let best = ordered[0]!;
  if (ordered.length === 1) return best;
  let nodes = 0;
  const tick = () => {
    if ((++nodes & 31) === 0 && now() > deadline) throw new Timeout();
  };
  const score = (w: number | null, ply: number) =>
    w === null ? 0 : w === seat ? WIN - ply : -WIN + ply;

  const quiesce = (p: P, alpha: number, beta: number, depth: number, ply: number): number => {
    tick();
    const t = g.terminal(p);
    if (t) return score(t.winner, ply);
    const stand = g.evaluate(p, seat);
    if (depth <= 0 || !g.tactical) return stand;
    const caps = g.tactical(p);
    if (!caps.length) return stand;
    const max = g.toMove(p) === seat;
    let v = stand;
    if (max) {
      if (stand >= beta) return stand;
      let a = Math.max(alpha, stand);
      for (const m of caps) {
        v = Math.max(v, quiesce(g.play(p, m), a, beta, depth - 1, ply + 1));
        a = Math.max(a, v);
        if (a >= beta) break;
      }
      return v;
    }
    if (stand <= alpha) return stand;
    let b = Math.min(beta, stand);
    for (const m of caps) {
      v = Math.min(v, quiesce(g.play(p, m), alpha, b, depth - 1, ply + 1));
      b = Math.min(b, v);
      if (alpha >= b) break;
    }
    return v;
  };

  const ab = (p: P, depth: number, alpha: number, beta: number, ply: number): number => {
    tick();
    const t = g.terminal(p);
    if (t) return score(t.winner, ply);
    if (depth <= 0)
      return qDepth && g.tactical ? quiesce(p, alpha, beta, qDepth, ply) : g.evaluate(p, seat);
    const ms = g.moves(p);
    if (!ms.length) return score(g.stuck(p).winner, ply);
    const max = g.toMove(p) === seat;
    let v = max ? -Infinity : Infinity;
    for (const m of ms) {
      const c = ab(g.play(p, m), depth - 1, alpha, beta, ply + 1);
      if (max) {
        v = Math.max(v, c);
        alpha = Math.max(alpha, v);
      } else {
        v = Math.min(v, c);
        beta = Math.min(beta, v);
      }
      if (alpha >= beta) break;
    }
    return v;
  };

  for (let depth = 1; depth <= o.maxDepth; depth++) {
    try {
      let alpha = -Infinity;
      let bestHere = ordered[0]!;
      for (const m of ordered) {
        const c = ab(g.play(root, m), depth - 1, alpha, Infinity, 1);
        if (c > alpha) {
          alpha = c;
          bestHere = m;
        }
      }
      best = bestHere;
      ordered = [bestHere, ...ordered.filter((m) => m !== bestHere)];
      if (Math.abs(alpha) >= WIN - 1000) break;
    } catch (e) {
      if (e instanceof Timeout) break;
      throw e;
    }
    if (now() > deadline) break;
  }
  return best;
}

/** One look ahead: the move whose position scores best, with a little noise. */
export function greedy<P, M extends NonNullable<unknown>>(
  g: SearchGame<P, M>,
  root: P,
  seat: number,
  rng: Rng,
  noise = 0,
): M {
  const ms = g.moves(root);
  if (!ms.length) throw new Error("no legal moves");
  let best = ms[0]!;
  let bestV = -Infinity;
  for (const m of ms) {
    const p = g.play(root, m);
    const t = g.terminal(p);
    const v = t
      ? t.winner === null
        ? 0
        : t.winner === seat
          ? WIN
          : -WIN
      : g.evaluate(p, seat) + rng.next() * noise;
    if (v > bestV) {
      bestV = v;
      best = m;
    }
  }
  return best;
}
