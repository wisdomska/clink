/**
 * KEEP-03 / ACC-06: automatic timeline milestones and the next anniversary.
 * Dates are calendar days (YYYY-MM-DD); all maths is in UTC so it is stable.
 */
export interface Milestone {
  key: string;
  title: string;
  date: string;
}

const DAY = 86_400_000;
const iso = (t: number) => new Date(t).toISOString().slice(0, 10);
const at = (d: string) => Date.parse(`${d}T00:00:00Z`);

function addYears(d: string, n: number): string {
  const [y, m, day] = d.split("-").map(Number) as [number, number, number];
  // 29 February falls back to 28 February in non-leap years.
  const t = Date.UTC(y + n, m - 1, day);
  const back = new Date(t).getUTCMonth() !== m - 1 ? Date.UTC(y + n, m - 1, 28) : t;
  return iso(back);
}

/** Milestones reached on or before `today`, given the start date (or link date). */
export function reachedMilestones(start: string, today: string, together: boolean): Milestone[] {
  const out: Milestone[] = [];
  const s = at(start);
  const t = at(today);
  for (const n of [100, 500, 1000]) {
    const d = s + n * DAY;
    if (d <= t)
      out.push({
        key: `days-${n}`,
        title: together
          ? `${n.toLocaleString("en-GB")} days together.`
          : `${n.toLocaleString("en-GB")} days on Clink.`,
        date: iso(d),
      });
  }
  if (together) {
    for (let y = 1; y <= 80; y++) {
      const d = addYears(start, y);
      if (at(d) > t) break;
      out.push({
        key: `anniversary-${y}`,
        title: y === 1 ? "One year together." : `${y} years together.`,
        date: d,
      });
    }
  }
  return out;
}

/** The next anniversary strictly after `today`, and how many days away it is. */
export function nextAnniversary(
  start: string,
  today: string,
): { years: number; date: string; inDays: number } {
  let y = 1;
  while (at(addYears(start, y)) <= at(today)) y++;
  const date = addYears(start, y);
  return { years: y, date, inDays: Math.round((at(date) - at(today)) / DAY) };
}
