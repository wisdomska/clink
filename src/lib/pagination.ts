/**
 * Page maths for every paginated list (ported from SPUZL's admin pagination).
 * Pure, so the screens, the API routes and the unit tests share it.
 */

/** Number of pages; an empty list still has one (empty) page. */
export const pageCount = (total: number, size: number) =>
  Math.max(1, Math.ceil(Math.max(0, total) / Math.max(1, size)));

/** 1-based positions of the first and last row shown ("Showing 26 to 50 of 312"); 0 and 0 when there are none. */
export function shownRange(page: number, size: number, total: number) {
  const first = (page - 1) * size + 1;
  if (total <= 0 || first > total) return { first: 0, last: 0 };
  return { first, last: Math.min(page * size, total) };
}

/** A page button or a gap ("…") in the pagination bar. */
export type PageItem = number | "gap";

/**
 * Page buttons with gaps: the first and last page always, `siblings` pages
 * either side of the current one, and a gap wherever pages are skipped. Short
 * lists show every page. The list never changes length while paging (7 slots
 * with one sibling), so the bar doesn't jump around.
 */
export function pageItems(page: number, pages: number, siblings = 1): PageItem[] {
  const range = (a: number, b: number) =>
    Array.from({ length: Math.max(0, b - a + 1) }, (_, i) => a + i);
  const slots = siblings * 2 + 5;
  if (pages <= slots) return range(1, Math.max(1, pages));
  const p = Math.min(Math.max(1, page), pages);
  const left = Math.max(p - siblings, 1);
  const right = Math.min(p + siblings, pages);
  const leftGap = left > 3;
  const rightGap = right < pages - 2;
  const edge = 3 + siblings * 2;
  if (!leftGap) return [...range(1, edge), "gap", pages];
  if (!rightGap) return [1, "gap", ...range(pages - edge + 1, pages)];
  return [1, "gap", ...range(left, right), "gap", pages];
}

/** One page of an in-memory list. */
export const pageOf = <T>(items: readonly T[], page: number, size: number): readonly T[] =>
  items.slice((page - 1) * size, page * size);

/** Inclusive row offsets for Supabase `.range(from, to)`. */
export function rangeOf(page: number, size: number) {
  const from = (page - 1) * size;
  return { from, to: from + size - 1 };
}
