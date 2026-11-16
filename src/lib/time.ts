/** Time-zone maths for dual clocks, quiet hours and reminders. Pure and unit-tested. */

export function formatClock(d: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone,
  }).format(d);
}

/** Local hour (0-23) and minute in a zone. */
export function localParts(
  d: Date,
  timeZone: string,
): { hour: number; minute: number; weekday: number; dateKey: string } {
  const f = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hourCycle: "h23",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = Object.fromEntries(f.formatToParts(d).map((p) => [p.type, p.value]));
  const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return {
    hour: Number(parts.hour) % 24,
    minute: Number(parts.minute),
    weekday: weekdays.indexOf(parts.weekday ?? "Mon"),
    dateKey: `${parts.year}-${parts.month}-${parts.day}`,
  };
}

/** Prototype rule: night is 20:00 to 05:59. */
export function isNight(d: Date, timeZone: string): boolean {
  const { hour } = localParts(d, timeZone);
  return hour >= 20 || hour < 6;
}

/** Offset of a zone from UTC in minutes at instant d. */
export function zoneOffsetMinutes(d: Date, timeZone: string): number {
  const f = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const p = Object.fromEntries(f.formatToParts(d).map((x) => [x.type, x.value]));
  const asUtc = Date.UTC(
    Number(p.year),
    Number(p.month) - 1,
    Number(p.day),
    Number(p.hour) % 24,
    Number(p.minute),
    Number(p.second),
  );
  return Math.round((asUtc - Math.floor(d.getTime() / 1000) * 1000) / 60000);
}

/** "SAME HOUR" or "5 H APART" (rounded to the half hour, e.g. "5.5 H APART"). */
export function diffLabel(d: Date, a: string, b: string): string {
  const diff = Math.abs(zoneOffsetMinutes(d, a) - zoneOffsetMinutes(d, b));
  if (diff < 30) return "SAME HOUR";
  const h = Math.round(diff / 30) / 2;
  return `${Number.isInteger(h) ? h : h.toFixed(1)} H APART`;
}

/** Is local time t (HH:MM) inside [start, end) where the window may wrap midnight? */
export function inWindow(hour: number, minute: number, start: string, end: string): boolean {
  const toMin = (s: string) => {
    const [h, m] = s.split(":").map(Number);
    return (h ?? 0) * 60 + (m ?? 0);
  };
  const t = hour * 60 + minute;
  const s = toMin(start);
  const e = toMin(end);
  if (s === e) return false;
  return s < e ? t >= s && t < e : t >= s || t < e;
}

export function isQuietHours(d: Date, timeZone: string, start: string, end: string): boolean {
  const { hour, minute } = localParts(d, timeZone);
  return inWindow(hour, minute, start, end);
}

/** Days / hours / minutes until target, never negative. */
export function countdownParts(
  now: Date,
  target: Date,
): { days: number; hours: number; minutes: number; done: boolean } {
  const ms = target.getTime() - now.getTime();
  if (ms <= 0) return { days: 0, hours: 0, minutes: 0, done: true };
  const total = Math.floor(ms / 60000);
  return {
    days: Math.floor(total / 1440),
    hours: Math.floor((total % 1440) / 60),
    minutes: total % 60,
    done: false,
  };
}

/** "21:00 London / 02:00 Sun Accra" style: wall time of an instant in a zone. */
export function wallTime(d: Date, timeZone: string, withDay = false): string {
  const t = formatClock(d, timeZone);
  if (!withDay) return t;
  const day = new Intl.DateTimeFormat("en-GB", { weekday: "short", timeZone }).format(d);
  return `${t} ${day}`;
}

/** Convert a wall-clock date+time in a zone to a UTC Date. */
export function zonedToUtc(dateKey: string, time: string, timeZone: string): Date {
  const [y, mo, da] = dateKey.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  const guess = new Date(Date.UTC(y!, mo! - 1, da!, h!, mi!));
  const off1 = zoneOffsetMinutes(guess, timeZone);
  const first = new Date(guess.getTime() - off1 * 60000);
  const off2 = zoneOffsetMinutes(first, timeZone);
  return off1 === off2 ? first : new Date(guess.getTime() - off2 * 60000);
}

/**
 * How long ago, the way people say it: "Just now", "5 min ago", "3 h ago",
 * "Yesterday", "4 days ago", then the date itself ("12 Mar", or "12 Mar 2025"
 * in an earlier year) once it's more than a week back.
 */
export function timeAgo(iso: string | null | undefined, now: Date = new Date()): string {
  if (!iso) return "Never";
  const t = new Date(iso);
  const min = Math.floor((now.getTime() - t.getTime()) / 60000);
  if (min < 1) return "Just now";
  if (min < 60) return `${min} min ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return "Yesterday";
  if (d < 7) return `${d} days ago`;
  return t.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    ...(t.getFullYear() !== now.getFullYear() ? { year: "numeric" } : {}),
  });
}
