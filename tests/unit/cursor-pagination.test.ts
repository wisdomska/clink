import { describe, it, expect } from "vitest";
import {
  PAGE_SIZE,
  MAX_PAGE_SIZE,
  decodeCursor,
  encodeCursor,
  keysetFilter,
  pageParams,
  parseLimit,
  toPage,
} from "@/features/plans/cursor";

const ID = "3f2a9c1e-5b7d-4e8f-9a0b-1c2d3e4f5a6b";

describe("cursor pagination (created_at + id keyset)", () => {
  it("round-trips a Postgres timestamp and id without losing precision", () => {
    const at = "2026-11-16T10:00:00.123456+00:00";
    const c = encodeCursor(at, ID);
    expect(c).toMatch(/^[A-Za-z0-9_-]+$/); // URL safe
    expect(decodeCursor(c)).toEqual({ at, id: ID });
    expect(decodeCursor(encodeCursor("2026-11-16", ID))).toEqual({ at: "2026-11-16", id: ID });
  });

  it("treats missing or tampered cursors as the first page", () => {
    expect(decodeCursor(null)).toBeNull();
    expect(decodeCursor("")).toBeNull();
    expect(decodeCursor("not-base64!!")).toBeNull();
    expect(decodeCursor(encodeCursor("yesterday", ID))).toBeNull();
    expect(decodeCursor(encodeCursor("2026-11-16", "1 or 1=1"))).toBeNull();
    expect(decodeCursor(encodeCursor('2026-11-16",id.gt.0', ID))).toBeNull();
  });

  it("clamps the page size", () => {
    expect(parseLimit(null)).toBe(PAGE_SIZE);
    expect(parseLimit("abc")).toBe(PAGE_SIZE);
    expect(parseLimit("0")).toBe(1);
    expect(parseLimit("5")).toBe(5);
    expect(parseLimit("9999")).toBe(MAX_PAGE_SIZE);
    const p = pageParams(
      `https://x.test/api/letters?limit=3&cursor=${encodeCursor("2026-01-01", ID)}`,
    );
    expect(p).toEqual({ limit: 3, cursor: { at: "2026-01-01", id: ID } });
  });

  it("builds a stable keyset filter with id as the tie-breaker", () => {
    const c = { at: "2026-11-16T10:00:00+00:00", id: ID };
    expect(keysetFilter("created_at", c, "desc")).toBe(
      `created_at.lt."${c.at}",and(created_at.eq."${c.at}",id.lt.${ID})`,
    );
    expect(keysetFilter("unlock_at", c, "asc")).toBe(
      `unlock_at.gt."${c.at}",and(unlock_at.eq."${c.at}",id.gt.${ID})`,
    );
  });

  it("pages through a list with no gaps or repeats, even with tied timestamps", () => {
    // 47 rows, newest first, several sharing a timestamp.
    const rows = Array.from({ length: 47 }, (_, i) => ({
      id: `00000000-0000-4000-8000-${String(1000 - i).padStart(12, "0")}`,
      created_at: `2026-11-${String(30 - Math.floor(i / 3)).padStart(2, "0")}T12:00:00+00:00`,
    }));
    // A tiny in-memory stand-in for the database query the routes run.
    const fetchPage = (cursor: string | null, limit = PAGE_SIZE) => {
      const c = decodeCursor(cursor);
      const after = c
        ? rows.filter((r) => r.created_at < c.at || (r.created_at === c.at && r.id < c.id))
        : rows;
      return toPage(
        after.slice(0, limit + 1),
        limit,
        (r) => r.created_at,
        (r) => r.id,
      );
    };
    const seen: string[] = [];
    let cursor: string | null = null;
    let pages = 0;
    do {
      const page = fetchPage(cursor);
      seen.push(...page.items.map((r) => r.id));
      cursor = page.nextCursor;
      pages++;
    } while (cursor && pages < 10);
    expect(pages).toBe(3);
    expect(seen).toEqual(rows.map((r) => r.id));
    expect(new Set(seen).size).toBe(rows.length);
  });

  it("says there is no next page when the last page is exactly full", () => {
    const rows = Array.from({ length: PAGE_SIZE }, (_, i) => ({ id: String(i), at: "2026-01-01" }));
    expect(
      toPage(
        rows,
        PAGE_SIZE,
        (r) => r.at,
        (r) => r.id,
      ).nextCursor,
    ).toBeNull();
  });
});
