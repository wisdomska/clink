import "server-only";
import { cookies } from "next/headers";
import { sign, unsign } from "@/lib/server/crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { deny, requireCouple, type CoupleCaller } from "@/lib/server/api";

export const TIERS = ["Flirty", "Steamy", "Spicy", "Unhinged"] as const;
export type Tier = (typeof TIERS)[number];
export const DARK_COOKIE = "clink_dark";
export const IDLE_MS = 2 * 60 * 1000; // DARK-01 auto-lock after 2 minutes idle

export function tierRank(t: string): number {
  return TIERS.indexOf(t as Tier) + 1;
}
export function tiersUpTo(rank: number): Tier[] {
  return TIERS.slice(0, Math.max(0, rank)) as Tier[];
}

/** Issue or refresh the After Dark session (PIN or passkey verified). Sliding 2-minute idle window. */
export async function setDarkSession(userId: string) {
  const store = await cookies();
  const exp = Date.now() + IDLE_MS;
  store.set(DARK_COOKIE, sign(`${userId}|${exp}`, "dark"), {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/",
    maxAge: Math.ceil(IDLE_MS / 1000),
  });
}

export async function clearDarkSession() {
  (await cookies()).delete(DARK_COOKIE);
}

export async function hasDarkSession(userId: string): Promise<boolean> {
  const v = unsign((await cookies()).get(DARK_COOKIE)?.value, "dark");
  if (!v) return false;
  const [uid, exp] = v.split("|");
  return uid === userId && Number(exp) > Date.now();
}

export interface DarkCaller extends CoupleCaller {
  rank: number; // effective tier rank for the couple (0 = nothing unlocked)
}

/**
 * Every After Dark route goes through here: linked couple, both opted in,
 * a live PIN/passkey session (refreshed on activity), and the couple's
 * effective tier (lower choice wins, Unhinged needs both age-verified).
 */
export async function requireDark(opts: { minRank?: number; refresh?: boolean } = {}): Promise<DarkCaller> {
  const caller = await requireCouple();
  if (!(await hasDarkSession(caller.user.id))) throw deny(401, "dark_locked", "After Dark is locked.");
  if (opts.refresh !== false) await setDarkSession(caller.user.id);
  const rank = await effectiveRank(caller.coupleId);
  if ((opts.minRank ?? 0) > rank) throw deny(403, "tier_locked", "That tier isn't open for you both.");
  return { ...caller, rank };
}

export async function effectiveRank(coupleId: string): Promise<number> {
  const { data, error } = await supabaseAdmin().rpc("svc_effective_tier_rank", { p_couple: coupleId });
  if (error) throw error;
  return Number(data ?? 0);
}

export async function bothAllowSaved(coupleId: string): Promise<boolean> {
  const { data } = await supabaseAdmin().from("couple_members").select("allow_saved_spicy").eq("couple_id", coupleId).is("left_at", null);
  return (data ?? []).length === 2 && (data ?? []).every((m) => m.allow_saved_spicy);
}
