import { describe, it, expect } from "vitest";
import { pageCount, pageItems, pageOf, rangeOf, shownRange } from "@/lib/pagination";

describe("pagination maths", () => {
  it("counts pages, with one (empty) page for an empty list", () => {
    expect(pageCount(0, 25)).toBe(1);
    expect(pageCount(25, 25)).toBe(1);
    expect(pageCount(26, 25)).toBe(2);
  });
  it("says which rows are showing", () => {
    expect(shownRange(2, 25, 312)).toEqual({ first: 26, last: 50 });
    expect(shownRange(13, 25, 312)).toEqual({ first: 301, last: 312 });
    expect(shownRange(1, 25, 0)).toEqual({ first: 0, last: 0 });
    expect(shownRange(5, 25, 30)).toEqual({ first: 0, last: 0 });
  });
  it("shows every page for short lists", () => {
    expect(pageItems(1, 1)).toEqual([1]);
    expect(pageItems(3, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });
  it("keeps the first and last page with gaps, and a fixed width while paging", () => {
    expect(pageItems(1, 20)).toEqual([1, 2, 3, 4, 5, "gap", 20]);
    expect(pageItems(10, 20)).toEqual([1, "gap", 9, 10, 11, "gap", 20]);
    expect(pageItems(20, 20)).toEqual([1, "gap", 16, 17, 18, 19, 20]);
    for (let p = 1; p <= 40; p++) {
      const items = pageItems(p, 40);
      expect(items).toHaveLength(7);
      expect(items).toContain(p);
      expect(items[0]).toBe(1);
      expect(items.at(-1)).toBe(40);
    }
  });
  it("slices a page and gives Supabase offsets", () => {
    const xs = Array.from({ length: 60 }, (_, i) => i);
    expect(pageOf(xs, 3, 25)).toEqual(xs.slice(50));
    expect(rangeOf(2, 25)).toEqual({ from: 25, to: 49 });
  });
});
