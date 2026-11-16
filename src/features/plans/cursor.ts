/**
 * Keyset (cursor) pagination shared by the long lists in Keep, Plans, Play and
 * After Dark. Rows are ordered by one sort column plus `id` as a tie-breaker, and
 * the cursor is the (sort value, id) pair of the last row on a page. Works on
 * the server (route handlers with the caller's RLS client) and in the browser.
 */

export const PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 50;

export interface Cursor {
  at: string;
  id: string;
}

export interface CursorPage<T> {
  items: T[];
  nextCursor: string | null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// ISO dates and timestamps as Postgres returns them: 2026-11-16, 2026-11-16T10:00:00.123456+00:00
const STAMP = /^\d{4}-\d{2}-\d{2}([T ][0-9:.]+(Z|[+-]\d{2}(:?\d{2})?)?)?$/;

function b64urlEncode(s: string) {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(s: string) {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

export function encodeCursor(at: string, id: string): string {
  return b64urlEncode(`${at}|${id}`);
}

/** Returns null for a missing or malformed cursor, so a bad value just means "first page". */
export function decodeCursor(raw: string | null | undefined): Cursor | null {
  if (!raw || raw.length > 200) return null;
  try {
    const [at, id, ...rest] = b64urlDecode(raw).split("|");
    if (rest.length || !at || !id || !UUID.test(id) || !STAMP.test(at)) return null;
    return { at, id };
  } catch {
    return null;
  }
}

/** Clamp a `limit` query value to 1..MAX_PAGE_SIZE, defaulting to PAGE_SIZE. */
export function parseLimit(raw: string | null | undefined, fallback = PAGE_SIZE): number {
  const n = Number(raw);
  if (!raw || !Number.isFinite(n)) return fallback;
  return Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(n)));
}

/**
 * PostgREST `or` filter for "rows after the cursor". Values are double-quoted
 * because timestamps contain reserved characters (`:` and `.`).
 */
export function keysetFilter(col: string, c: Cursor, dir: "asc" | "desc"): string {
  const op = dir === "desc" ? "lt" : "gt";
  return `${col}.${op}."${c.at}",and(${col}.eq."${c.at}",id.${op}.${c.id})`;
}

/**
 * Turn `limit + 1` fetched rows into a page: the extra row only tells us there
 * is more, it is never returned.
 */
export function toPage<T>(
  rows: T[],
  limit: number,
  at: (row: T) => string,
  id: (row: T) => string,
): CursorPage<T> {
  const items = rows.slice(0, limit);
  const last = items[items.length - 1];
  return {
    items,
    nextCursor: rows.length > limit && last ? encodeCursor(at(last), id(last)) : null,
  };
}

/** Read `cursor` and `limit` from a request URL. */
export function pageParams(url: URL | string) {
  const u = typeof url === "string" ? new URL(url) : url;
  return {
    cursor: decodeCursor(u.searchParams.get("cursor")),
    limit: parseLimit(u.searchParams.get("limit")),
  };
}
