"use client";
import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowDown, ArrowUp, ArrowsDownUp, DownloadSimple } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { cn } from "@/components/ui/cn";
import { DateField } from "@/components/ui/pickers";
import { Select } from "@/components/ui/select";

export const PAGE_SIZES = [25, 50, 100];

/**
 * Table state that lives in the URL (?page=&size=&sort=&dir= plus any filters),
 * so reload, Back and shared links all keep the view. Changing a filter or the
 * sort goes back to page 1.
 */
export function useListParams<S extends string>(defaults: { sort: S; dir: "asc" | "desc" }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const page = Math.max(1, Math.floor(Number(params.get("page")) || 1));
  const rawSize = Number(params.get("size"));
  const size = PAGE_SIZES.includes(rawSize) ? rawSize : PAGE_SIZES[0]!;
  const sort = (params.get("sort") as S | null) ?? defaults.sort;
  const d = params.get("dir");
  const dir: "asc" | "desc" = d === "asc" || d === "desc" ? d : defaults.dir;
  const get = (k: string) => params.get(k) ?? "";

  /**
   * Update the URL. A page change adds a history entry, so Back returns to the
   * page you were on; filters, sort and size replace it (and go to page 1).
   */
  function set(
    patch: Record<string, string | number | null | undefined>,
    opts: { replace?: boolean } = {},
  ) {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === undefined || v === "") next.delete(k);
      else next.set(k, String(v));
    }
    // Anything but a page change starts again from page 1.
    if (!("page" in patch)) next.delete("page");
    if (next.get("page") === "1") next.delete("page");
    if (next.get("size") === String(PAGE_SIZES[0])) next.delete("size");
    if (next.get("sort") === defaults.sort && !next.get("dir")) next.delete("sort");
    const qs = next.toString();
    const url = `${pathname}${qs ? `?${qs}` : ""}`;
    const onlyPage = Object.keys(patch).length === 1 && "page" in patch;
    if (onlyPage && !opts.replace) router.push(url, { scroll: false });
    else router.replace(url, { scroll: false });
  }

  /** Click a column: same column flips direction, a new one starts descending (or asc for text). */
  function toggleSort(col: S, firstDir: "asc" | "desc" = "desc") {
    if (col === sort) set({ sort: col, dir: dir === "asc" ? "desc" : "asc" });
    else set({ sort: col, dir: firstDir });
  }

  /** Query string for the API: the page state plus the named filters. */
  function query(filters: string[], extra: Record<string, string> = {}) {
    const q = new URLSearchParams({ page: String(page), size: String(size), sort, dir });
    for (const f of filters) if (params.get(f)) q.set(f, params.get(f)!);
    for (const [k, v] of Object.entries(extra)) q.set(k, v);
    return q.toString();
  }

  return { page, size, sort, dir, get, set, toggleSort, query };
}

/** A sortable column header: a real button, with aria-sort on the header cell. */
export function SortTh<S extends string>({
  col,
  label,
  sort,
  dir,
  onSort,
  firstDir,
  className,
}: {
  col: S;
  label: string;
  sort: string;
  dir: "asc" | "desc";
  onSort: (col: S, firstDir?: "asc" | "desc") => void;
  firstDir?: "asc" | "desc";
  className?: string;
}) {
  const on = sort === col;
  const Icon = !on ? ArrowsDownUp : dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <th
      scope="col"
      aria-sort={on ? (dir === "asc" ? "ascending" : "descending") : "none"}
      className={cn("px-2 py-1 font-medium", className)}
    >
      <button
        type="button"
        onClick={() => onSort(col, firstDir)}
        className={cn(
          "hover:text-text rounded-input inline-flex h-11 cursor-pointer items-center gap-1.5 border-0 bg-transparent px-2 text-xs font-medium",
          on ? "text-text" : "text-muted",
        )}
      >
        {label}
        <Icon size={13} weight="bold" aria-hidden className={on ? "text-accent" : "text-faint"} />
        <span className="sr-only">
          {on ? `, sorted ${dir === "asc" ? "ascending" : "descending"}` : ", sortable"}
        </span>
      </button>
    </th>
  );
}

/**
 * Downloads the server's CSV of the whole filtered set (not just this page).
 * The API logs every export in the audit log.
 */
export function ExportButton({ url, disabled }: { url: string; disabled?: boolean }) {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      size="xs"
      variant="ghost"
      loading={busy}
      softDisabled={disabled}
      onClick={async () => {
        if (disabled) return toast("Nothing to export with these filters.");
        setBusy(true);
        try {
          const r = await fetch(url);
          if (!r.ok) {
            const d = await r.json().catch(() => ({}));
            throw new Error(d.message ?? "Couldn't export that. Try again.");
          }
          const name =
            /filename="([^"]+)"/.exec(r.headers.get("Content-Disposition") ?? "")?.[1] ??
            "clink-export.csv";
          const href = URL.createObjectURL(await r.blob());
          const a = document.createElement("a");
          a.href = href;
          a.download = name;
          a.click();
          setTimeout(() => URL.revokeObjectURL(href), 1000);
        } catch (e) {
          toast.err(e instanceof Error ? e.message : "Couldn't export that. Try again.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <DownloadSimple size={16} aria-hidden /> Export CSV
    </Button>
  );
}

/** A clock that ticks every few seconds, without calling Date.now() during render. */
export function useNow(everyMs = 10_000) {
  const [now, setNow] = useState(0);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const t = setInterval(tick, everyMs);
    return () => {
      clearTimeout(first);
      clearInterval(t);
    };
  }, [everyMs]);
  return now;
}

/** "Updated just now" / "Updated 2 min ago" for a live-refreshing view. */
export function UpdatedAgo({ at }: { at: number }) {
  const now = useNow();
  const mins = at && now ? Math.floor((now - at) / 60_000) : 0;
  if (!at) return null;
  return (
    <span className="text-faint text-xs tabular-nums">
      {mins < 1 ? "Updated just now" : `Updated ${mins} min ago`}
    </span>
  );
}

/** Hours since an ISO time, from a ticking clock (0 until the clock starts). */
export function hoursSince(iso: string, now: number) {
  return now ? Math.max(0, (now - new Date(iso).getTime()) / 3_600_000) : 0;
}

/**
 * Page width by type, centred: forms read best narrow, tables and dashboards
 * get more room, and data-heavy logs can use the full width.
 */
export function AdminPage({
  width = "wide",
  className,
  children,
}: {
  width?: "form" | "wide" | "full";
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "an-screen mx-auto flex w-full flex-col gap-5",
        width === "form" ? "max-w-[720px]" : width === "wide" ? "max-w-[1280px]" : "max-w-[1680px]",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** A labelled native select for filter bars (44px tall, keyboard friendly). */
export function FilterSelect({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label htmlFor={id} className="text-muted text-xs font-medium">
        {label}
      </label>
      <Select id={id} value={value} onChange={onChange} options={options} size="sm" />
    </div>
  );
}

/** A labelled date input for filter bars. */
export function FilterDate({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label htmlFor={id} className="text-muted text-xs font-medium">
        {label}
      </label>
      <DateField id={id} value={value} onChange={onChange} placeholder="Any" size="sm" />
    </div>
  );
}
