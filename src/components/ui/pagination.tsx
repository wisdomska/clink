"use client";
import { useId } from "react";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { cn } from "./cn";
import { Select } from "./select";

/** Page numbers to show: first, last, and the current page with one neighbour each side. */
export function pageItems(page: number, pages: number): Array<number | "gap"> {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  const keep = new Set([1, pages, page - 1, page, page + 1]);
  // Near either end, show a full run so the bar doesn't jump in width.
  if (page <= 4) [2, 3, 4, 5].forEach((n) => keep.add(n));
  if (page >= pages - 3) [pages - 4, pages - 3, pages - 2, pages - 1].forEach((n) => keep.add(n));
  const nums = [...keep].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
  const out: Array<number | "gap"> = [];
  nums.forEach((n, i) => {
    if (i > 0 && n - nums[i - 1]! > 1) out.push(n - nums[i - 1]! === 2 ? n - 1 : "gap");
    out.push(n);
  });
  return out;
}

const btn =
  "press inline-flex h-11 min-w-11 cursor-pointer items-center justify-center rounded-input border px-3 text-sm font-medium tabular-nums transition-colors disabled:cursor-not-allowed disabled:opacity-40";

/**
 * Page numbers with gaps, previous and next, a page-size picker and a
 * "Showing 26-50 of 312" summary. Plain buttons and a native select, so it
 * works with Tab, Enter and Space, and screen readers hear the current page.
 */
export function Pagination({
  page,
  size,
  total,
  onPage,
  onSize,
  sizes = [25, 50, 100],
  noun = "results",
  label = "Pages",
  className,
}: {
  page: number;
  size: number;
  total: number;
  onPage: (page: number) => void;
  onSize?: (size: number) => void;
  sizes?: number[];
  /** Plural noun for the summary, e.g. "accounts". */
  noun?: string;
  label?: string;
  className?: string;
}) {
  const id = useId();
  const pages = Math.max(1, Math.ceil(total / size));
  const cur = Math.min(Math.max(1, page), pages);
  const first = total ? (cur - 1) * size + 1 : 0;
  const last = Math.min(total, cur * size);
  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="text-muted flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <span aria-live="polite" className="tabular-nums">
          {total
            ? `Showing ${first.toLocaleString("en-GB")}-${last.toLocaleString("en-GB")} of ${total.toLocaleString("en-GB")} ${noun}`
            : `No ${noun}`}
        </span>
        {onSize && (
          <span className="flex items-center gap-2">
            <label htmlFor={`${id}-size`}>Per page</label>
            <Select
              id={`${id}-size`}
              value={String(size)}
              onChange={(v) => onSize(Number(v))}
              options={sizes.map((s) => ({ value: String(s), label: String(s) }))}
              size="sm"
              className="h-11 w-[84px]"
            />
          </span>
        )}
      </div>
      {pages > 1 && (
        <nav aria-label={label}>
          <ul className="m-0 flex list-none flex-wrap items-center gap-1 p-0">
            <li>
              <button
                type="button"
                className={cn(btn, "border-line text-text hover:bg-s2 gap-1 bg-transparent")}
                disabled={cur <= 1}
                onClick={() => onPage(cur - 1)}
                aria-label="Previous page"
              >
                <CaretLeft size={16} aria-hidden />
                <span className="hidden sm:inline">Previous</span>
              </button>
            </li>
            {pageItems(cur, pages).map((n, i) =>
              n === "gap" ? (
                <li key={`gap-${i}`} aria-hidden className="text-faint px-1 text-sm">
                  ...
                </li>
              ) : (
                <li key={n}>
                  <button
                    type="button"
                    onClick={() => onPage(n)}
                    aria-current={n === cur ? "page" : undefined}
                    aria-label={`Page ${n}`}
                    className={cn(
                      btn,
                      n === cur
                        ? "bg-accent text-on-accent border-transparent font-bold"
                        : "border-line text-text hover:bg-s2 bg-transparent",
                    )}
                  >
                    {n}
                  </button>
                </li>
              ),
            )}
            <li>
              <button
                type="button"
                className={cn(btn, "border-line text-text hover:bg-s2 gap-1 bg-transparent")}
                disabled={cur >= pages}
                onClick={() => onPage(cur + 1)}
                aria-label="Next page"
              >
                <span className="hidden sm:inline">Next</span>
                <CaretRight size={16} aria-hidden />
              </button>
            </li>
          </ul>
        </nav>
      )}
    </div>
  );
}
