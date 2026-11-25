"use client";
import { useEffect, useId, useState, type ReactNode } from "react";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { pageCount, pageItems, pageOf, shownRange } from "@/lib/pagination";
import { cn } from "./cn";
import { Select } from "./select";

const fmt = (n: number) => n.toLocaleString("en-GB");

const btn =
  "press inline-flex h-11 min-w-11 cursor-pointer items-center justify-center gap-1 rounded-input px-3 text-sm font-semibold tabular-nums transition-colors disabled:cursor-not-allowed disabled:opacity-40";
const ghost = "border-line text-text hover:bg-s2 border bg-transparent";

/**
 * The pagination bar for every paged list, after SPUZL's: "Showing 26 to 50 of
 * 312 accounts", rows per page, First, Previous, page numbers with gaps (first
 * and last always shown, fixed width so it never jumps), Next and Last. 44 px
 * targets, real buttons with disabled ends, one labelled landmark, and the
 * summary announced politely. Steps back to the last page by itself when the
 * current one stops existing (rows resolved or deleted).
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
  /** `replace` is set when the bar corrects itself, so it doesn't add a history entry. */
  onPage: (page: number, opts?: { replace?: boolean }) => void;
  onSize?: (size: number) => void;
  sizes?: number[];
  /** Plural noun for the summary, e.g. "accounts". */
  noun?: string;
  label?: string;
  className?: string;
}) {
  const id = useId();
  const pages = pageCount(total, size);

  useEffect(() => {
    if (total > 0 && page > pages) onPage(pages, { replace: true });
  }, [total, page, pages, onPage]);

  if (total <= 0) return null;
  const cur = Math.min(Math.max(1, page), pages);
  const { first, last } = shownRange(cur, size, total);
  const options = (sizes.includes(size) ? sizes : [size, ...sizes]).map((s) => ({
    value: String(s),
    label: String(s),
  }));

  return (
    <nav
      aria-label={label}
      className={cn("flex flex-wrap items-center gap-x-4 gap-y-3", className)}
    >
      <p
        className="text-muted m-0 text-sm font-medium tabular-nums"
        aria-live="polite"
        aria-atomic="true"
      >
        Showing {fmt(first)} to {fmt(last)} of {fmt(total)} {noun}
      </p>
      {onSize && (
        <div className="text-muted flex items-center gap-2 text-sm font-semibold">
          <label htmlFor={`${id}-size`}>Rows</label>
          <Select
            id={`${id}-size`}
            value={String(size)}
            onChange={(v) => onSize(Number(v))}
            options={options}
            size="sm"
            className="w-[84px]"
          />
        </div>
      )}
      {pages > 1 && (
        <div className="flex flex-wrap items-center gap-1.5 sm:ml-auto">
          <button
            type="button"
            className={cn(btn, ghost, "max-md:hidden")}
            disabled={cur <= 1}
            onClick={() => onPage(1)}
            aria-label="First page"
          >
            First
          </button>
          <button
            type="button"
            className={cn(btn, ghost)}
            disabled={cur <= 1}
            onClick={() => onPage(cur - 1)}
            aria-label="Previous page"
          >
            <CaretLeft size={16} aria-hidden />
            <span className="max-sm:sr-only">Previous</span>
          </button>
          <ul className="m-0 flex list-none items-center gap-1 p-0">
            {pageItems(cur, pages).map((n, i) =>
              n === "gap" ? (
                <li
                  key={`gap-${i}`}
                  aria-hidden
                  className="text-faint flex h-11 w-6 items-center justify-center text-sm"
                >
                  …
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
                      "px-2",
                      n === cur
                        ? "bg-accent text-on-accent font-bold"
                        : "text-muted hover:bg-s2 hover:text-text bg-transparent",
                    )}
                  >
                    {fmt(n)}
                  </button>
                </li>
              ),
            )}
          </ul>
          <button
            type="button"
            className={cn(btn, ghost)}
            disabled={cur >= pages}
            onClick={() => onPage(cur + 1)}
            aria-label="Next page"
          >
            <span className="max-sm:sr-only">Next</span>
            <CaretRight size={16} aria-hidden />
          </button>
          <button
            type="button"
            className={cn(btn, ghost, "max-md:hidden")}
            disabled={cur >= pages}
            onClick={() => onPage(pages)}
            aria-label={`Last page, ${fmt(pages)}`}
          >
            Last
          </button>
        </div>
      )}
    </nav>
  );
}

/**
 * A long list that's already loaded, shown a page at a time, with the bar
 * under it once there's more than one page. Page state stays on the screen
 * (not the address bar), so several lists can share a screen.
 */
export function Paged<T>({
  items,
  size = 25,
  noun,
  label,
  children,
}: {
  items: readonly T[];
  size?: number;
  noun?: string;
  label: string;
  children: (rows: readonly T[]) => ReactNode;
}) {
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(size);
  return (
    <>
      {children(pageOf(items, page, perPage))}
      {items.length > size && (
        <Pagination
          className="pt-3"
          page={page}
          size={perPage}
          total={items.length}
          noun={noun}
          label={label}
          onPage={setPage}
          onSize={(s) => {
            setPerPage(s);
            setPage(1);
          }}
          sizes={[size, ...[25, 50, 100].filter((s) => s > size)]}
        />
      )}
    </>
  );
}
