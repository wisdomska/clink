"use client";
import { useQuery } from "@tanstack/react-query";

export interface DarkState {
  unlocked: boolean;
  rank: number;
  allowSaved: boolean;
  me: { setUp: boolean; tiers: string[]; passkey: boolean; noticeSeen: boolean; verified: boolean; lockedUntil: string | null };
  partner: { optedIn: boolean; tiers: string[]; verified: boolean; changedAt: string | null };
}

export async function darkFetch<T>(url: string, body?: unknown): Promise<T> {
  const r = await fetch(url, body === undefined ? undefined : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const d = await r.json().catch(() => ({}));
  if (r.status === 401 && d.error === "dark_locked") {
    window.location.href = `/dark?next=${encodeURIComponent(window.location.pathname)}`;
  }
  if (!r.ok) throw Object.assign(new Error(d.message ?? "Something went wrong."), { status: r.status, code: d.error });
  return d as T;
}

export function useDarkState() {
  return useQuery({ queryKey: ["dark-state"], queryFn: () => darkFetch<DarkState>("/api/dark/state"), staleTime: 5_000 });
}
