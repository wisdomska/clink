/** Pure age maths, shared by client validation and the server age gate. */

export interface Dob {
  day: number;
  month: number;
  year: number;
}

export function parseDob(d: Dob): Date | null {
  const { day, month, year } = d;
  if (!Number.isInteger(day) || !Number.isInteger(month) || !Number.isInteger(year)) return null;
  if (year < 1900 || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  )
    return null;
  return date;
}

/** Whole years between dob and `on`, using calendar dates (UTC). */
export function ageOn(dob: Date, on: Date): number {
  let age = on.getUTCFullYear() - dob.getUTCFullYear();
  const m = on.getUTCMonth() - dob.getUTCMonth();
  if (m < 0 || (m === 0 && on.getUTCDate() < dob.getUTCDate())) age -= 1;
  return age;
}

export function isAdult(dob: Date, on: Date = new Date()): boolean {
  return ageOn(dob, on) >= 18;
}

export function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
