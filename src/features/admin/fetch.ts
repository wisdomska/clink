"use client";
export async function adminFetch<T>(
  url: string,
  init?: { method?: string; body?: unknown },
): Promise<T> {
  const r = await fetch(
    url,
    init
      ? {
          method: init.method ?? "POST",
          headers: { "Content-Type": "application/json" },
          body: init.body === undefined ? undefined : JSON.stringify(init.body),
        }
      : undefined,
  );
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.message ?? "Request failed.");
  return d as T;
}
export const fmtBytes = (n: number) =>
  n > 1024 ** 3
    ? `${(n / 1024 ** 3).toFixed(2)} GB`
    : n > 1024 ** 2
      ? `${(n / 1024 ** 2).toFixed(1)} MB`
      : `${Math.round(n / 1024)} KB`;
