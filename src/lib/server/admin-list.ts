import "server-only";
import { NextResponse } from "next/server";

/** Page sizes every admin table offers. */
export const PAGE_SIZES = [25, 50, 100] as const;
/** CSV exports stop here so one click can't pull an unbounded table. */
export const EXPORT_MAX = 10000;

export interface Paging<S extends string> {
  page: number;
  size: number;
  from: number;
  to: number;
  sort: S;
  dir: "asc" | "desc";
  csv: boolean;
}

/**
 * Reads ?page=&size=&sort=&dir= (and ?format=csv) from an admin list request.
 * page is 1-based, size is one of 25/50/100, sort must be in the allowlist.
 */
export function paging<S extends string>(
  p: URLSearchParams,
  opts: { sorts: readonly S[]; sort: S; dir?: "asc" | "desc" },
): Paging<S> {
  const rawSize = Number(p.get("size"));
  const size = (PAGE_SIZES as readonly number[]).includes(rawSize) ? rawSize : PAGE_SIZES[0];
  const page = Math.max(1, Math.floor(Number(p.get("page")) || 1));
  const s = p.get("sort") as S | null;
  const sort = s && opts.sorts.includes(s) ? s : opts.sort;
  const d = p.get("dir");
  const dir = d === "asc" || d === "desc" ? d : (opts.dir ?? "desc");
  const from = (page - 1) * size;
  return { page, size, from, to: from + size - 1, sort, dir, csv: p.get("format") === "csv" };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v: string | null | undefined): v is string => Boolean(v && UUID.test(v));

/** YYYY-MM-DD only, so a filter value can never smuggle in query syntax. */
export const isDay = (v: string | null | undefined): v is string =>
  Boolean(v && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)));

/** End of a YYYY-MM-DD day, for inclusive "to" filters. */
export const endOfDay = (day: string) => `${day}T23:59:59.999Z`;

/** Guards against spreadsheet formula injection: cells starting = + - @ get a leading quote. */
export function csvCell(v: unknown): string {
  let s =
    v === null || v === undefined ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** A downloadable CSV (UTF-8 with BOM so spreadsheets read accents correctly). */
export function csvResponse(name: string, rows: Array<Record<string, unknown>>) {
  const cols = rows.length ? Object.keys(rows[0]!) : [];
  const body = [
    cols.map(csvCell).join(","),
    ...rows.map((r) => cols.map((c) => csvCell(r[c])).join(",")),
  ].join("\r\n");
  const file = `${name}-${new Date().toISOString().slice(0, 10)}.csv`;
  return new NextResponse("﻿" + body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${file}"`,
      "Cache-Control": "no-store",
    },
  });
}

/** Fetch every row of a query in pages of 1,000 (PostgREST caps a single response). */
export async function fetchAll<T>(
  run: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
  max = 50000,
): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; from < max; from += 1000) {
    const { data, error } = await run(from, from + 999);
    if (error) throw error;
    out.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return out;
}
