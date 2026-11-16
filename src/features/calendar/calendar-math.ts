/** Pure calendar maths on "YYYY-MM-DD" day keys (no time zones here). Unit-tested. */

export interface MonthRef {
  y: number;
  /** 0-11 */
  m: number;
}

const pad = (n: number) => String(n).padStart(2, "0");

export function keyOf(y: number, m: number, d: number): string {
  const t = new Date(Date.UTC(y, m, d));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

export function parseKey(key: string): { y: number; m: number; d: number } {
  const [y, m, d] = key.split("-").map(Number);
  return { y: y!, m: m! - 1, d: d! };
}

export function isDayKey(s: string | null | undefined): s is string {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const { y, m, d } = parseKey(s);
  return keyOf(y, m, d) === s;
}

export function addDays(key: string, n: number): string {
  const { y, m, d } = parseKey(key);
  return keyOf(y, m, d + n);
}

export function monthOf(key: string): MonthRef {
  const { y, m } = parseKey(key);
  return { y, m };
}

export function shiftMonth(ref: MonthRef, n: number): MonthRef {
  const t = new Date(Date.UTC(ref.y, ref.m + n, 1));
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() };
}

/** Monday = 0 ... Sunday = 6 */
export function weekdayOf(key: string): number {
  const { y, m, d } = parseKey(key);
  return (new Date(Date.UTC(y, m, d)).getUTCDay() + 6) % 7;
}

/** The 6 x 7 grid of day keys for a month, Monday first, padded with the neighbouring months. */
export function monthGrid(ref: MonthRef): string[] {
  const first = keyOf(ref.y, ref.m, 1);
  const start = addDays(first, -weekdayOf(first));
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

export function inMonth(key: string, ref: MonthRef): boolean {
  const { y, m } = parseKey(key);
  return y === ref.y && m === ref.m;
}

function isLeap(y: number) {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

/**
 * Does a yearly date ("MM-DD") fall on this day? 29 February is celebrated on
 * 28 February in years without one.
 */
export function isYearlyOn(mmdd: string, key: string): boolean {
  const { y } = parseKey(key);
  const md = key.slice(5);
  if (mmdd === "02-29" && !isLeap(y)) return md === "02-28";
  return md === mmdd;
}

/** Whole years from a start day to an anniversary day key. */
export function yearsSince(startKey: string, key: string): number {
  return parseKey(key).y - parseKey(startKey).y;
}
