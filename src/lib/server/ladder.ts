import "server-only";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { seeded } from "@/features/play/engines/types";

/**
 * Everyday words the daily ladder starts and ends on (the steps between can
 * be any real word). Warm, a bit romantic, never obscure.
 */
export const COMMON = (
  "love kiss hold hand home ship wine rose star moon gold ring song note wish dove " +
  "time date call text miss feel warm fire calm sand wave lake rain snow tree leaf " +
  "seed farm bird fish cake rice soup milk cola mint lime pear plum corn bean salt " +
  "door wall roof room desk lamp book page word line film play game team ball goal " +
  "road path town city park walk ride boat lane gate bell coin card gift sign mark " +
  "face eyes hair lips nose skin arms legs feet heart"
)
  .split(" ")
  .filter((w) => /^[a-z]{4}$/.test(w));

/**
 * Everyday four-letter words: the most common levels of SCOWL (the word lists
 * behind most spell checkers; wordlist-english, MIT), British spellings
 * included. Par and hints only ever use these, so the best route never needs a
 * word nobody knows. Players can still use any real word (isWord) and may beat par.
 */
const EVERYDAY_FILES = [
  "english-words-10.json",
  "english-words-20.json",
  "british-words-10.json",
  "british-words-20.json",
];
let graph: Set<string> | null = null;
export function everyday(): Set<string> {
  if (!graph) {
    const dir = join(process.cwd(), "node_modules", "wordlist-english");
    graph = new Set(
      EVERYDAY_FILES.flatMap(
        (f) => JSON.parse(readFileSync(join(dir, f), "utf8")) as string[],
      ).filter((w) => /^[a-z]{4}$/.test(w)),
    );
  }
  return graph;
}
const words4 = everyday;

function neighbours(w: string, set: Set<string>): string[] {
  const out: string[] = [];
  for (let i = 0; i < 4; i++)
    for (let c = 97; c < 123; c++) {
      const n = w.slice(0, i) + String.fromCharCode(c) + w.slice(i + 1);
      if (n !== w && set.has(n)) out.push(n);
    }
  return out;
}

const memo = new Map<string, Map<string, number>>();

/** Shortest distance from `start` to every everyday word it can reach (kept per start word). */
export function distances(start: string): Map<string, number> {
  const hit = memo.get(start);
  if (hit) return hit;
  const set = words4();
  const d = new Map([[start, 0]]);
  const q = [start];
  for (let i = 0; i < q.length; i++) {
    const w = q[i]!;
    for (const n of neighbours(w, set))
      if (!d.has(n)) {
        d.set(n, d.get(w)! + 1);
        q.push(n);
      }
  }
  memo.set(start, d);
  return d;
}

const hash = (s: string) => {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
  return h >>> 0;
};

/** The puzzle for a day: the same for everyone, worked out from the date alone. */
export function generateLadder(day: string) {
  const rand = seeded(hash(`ladder:${day}`));
  const words = COMMON.filter((w) => words4().has(w));
  for (let tries = 0; tries < 50; tries++) {
    const start = words[Math.floor(rand() * words.length)]!;
    const d = distances(start);
    const targets = words.filter((w) => {
      const n = d.get(w);
      return n !== undefined && n >= 3 && n <= 5;
    });
    if (targets.length) {
      const target = targets[Math.floor(rand() * targets.length)]!;
      return { start, target, par: d.get(target)! };
    }
  }
  return { start: "love", target: "kiss", par: distances("love").get("kiss") ?? 4 };
}

/**
 * The next step from `from` towards `target` on a shortest everyday route, or
 * null when there's no everyday route from there (an unusual word was used).
 */
export function hintStep(from: string, target: string): string | null {
  if (from === target) return null;
  const toTarget = distances(target);
  const here = toTarget.get(from);
  if (here === undefined) return null;
  return neighbours(from, words4()).find((n) => toTarget.get(n) === here - 1) ?? null;
}

/** Today's ladder, made once and kept so it never changes under anyone. */
export async function ladderFor(day: string) {
  const admin = supabaseAdmin();
  const { data } = await admin.from("daily_ladders").select("*").eq("day", day).maybeSingle();
  if (data) return data;
  const g = generateLadder(day);
  await admin
    .from("daily_ladders")
    .upsert({ day, ...g }, { onConflict: "day", ignoreDuplicates: true });
  const { data: again } = await admin.from("daily_ladders").select("*").eq("day", day).single();
  return again!;
}
