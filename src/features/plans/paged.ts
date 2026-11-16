"use client";
import type { InfiniteData, QueryClient, QueryKey } from "@tanstack/react-query";

/** Page size for the long shared lists in Plans (queue, our list). */
export const PAGE = 20;

export type Paged<T> = InfiniteData<T[], number>;

export const nextOffset = <T>(last: T[], all: T[][]) =>
  last.length === PAGE ? all.length * PAGE : undefined;

/** Optimistically rewrite every loaded item of an infinite list. Returns the snapshot for rollback. */
export async function editPaged<T>(
  qc: QueryClient,
  key: QueryKey,
  fn: (items: T[], pageIndex: number, pageCount: number) => T[],
) {
  await qc.cancelQueries({ queryKey: key });
  const prev = qc.getQueryData<Paged<T>>(key);
  if (prev) {
    qc.setQueryData<Paged<T>>(key, {
      ...prev,
      pages: prev.pages.map((p, i) => fn(p, i, prev.pages.length)),
    });
  }
  return prev;
}

export function flatPaged<T>(data: InfiniteData<T[], unknown> | undefined): T[] {
  return data?.pages.flat() ?? [];
}
