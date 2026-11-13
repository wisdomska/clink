/** Challenge maths (DATE-04): day index, streaks and badges. Pure. */
export interface ChallengeDay {
  day: number;
  done_by_a: string | null;
  done_by_b: string | null;
}

export function dayNumber(startOn: string, todayKey: string): number {
  const a = Date.parse(`${startOn}T00:00:00Z`);
  const b = Date.parse(`${todayKey}T00:00:00Z`);
  return Math.floor((b - a) / 86400000) + 1;
}

export const bothDone = (d?: ChallengeDay) => Boolean(d?.done_by_a && d?.done_by_b);

/** Consecutive both-done days ending today (or yesterday, if today isn't done yet). */
export function streak(days: ChallengeDay[], today: number): number {
  const by = new Map(days.map((d) => [d.day, d]));
  let n = 0;
  let d = bothDone(by.get(today)) ? today : today - 1;
  while (d >= 1 && bothDone(by.get(d))) {
    n++;
    d--;
  }
  return n;
}

export function badges(days: ChallengeDay[], today: number, length: number): string[] {
  const by = new Map(days.map((d) => [d.day, d]));
  const out: string[] = [];
  const firstWeek = [1, 2, 3, 4, 5, 6, 7].every((d) => bothDone(by.get(d)));
  if (firstWeek) out.push("First week");
  const past = Array.from({ length: Math.min(today - 1, length) }, (_, i) => i + 1);
  if (past.length >= 3 && past.every((d) => bothDone(by.get(d)))) out.push("No misses");
  if (Array.from({ length }, (_, i) => i + 1).every((d) => bothDone(by.get(d)))) out.push(length === 30 ? "30 for 30" : "7 for 7");
  return out;
}
