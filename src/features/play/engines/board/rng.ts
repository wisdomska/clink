import { seeded } from "../types";

/** Small seedable helper for the practice bots (tests pass a seed, play uses Math.random). */
export interface Rng {
  next(): number;
  pick<T>(arr: readonly T[]): T;
  chance(p: number): boolean;
}

export function makeRng(seed?: number): Rng {
  const next = seed === undefined ? Math.random : seeded(seed);
  return {
    next,
    pick: (arr) => {
      if (!arr.length) throw new Error("nothing to pick");
      return arr[Math.floor(next() * arr.length)]!;
    },
    chance: (p) => next() < p,
  };
}
