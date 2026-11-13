/** After Dark consent maths shared by client UI and unit tests (server truth lives in SQL). */
export const TIERS = ["Flirty", "Steamy", "Spicy", "Unhinged"] as const;
export type Tier = (typeof TIERS)[number];

/** Highest tier reachable without gaps: opting into Spicy without Steamy opens only Flirty. */
export function contiguousRank(tiers: readonly string[]): number {
  let r = 0;
  for (const t of TIERS) {
    if (tiers.includes(t)) r++;
    else break;
  }
  return r;
}

/** The lower choice always wins; Unhinged also needs both verified. */
export function effectiveRank(
  mine: readonly string[],
  theirs: readonly string[],
  bothVerified: boolean,
): number {
  const r = Math.min(contiguousRank(mine), contiguousRank(theirs));
  return r === 4 && !bothVerified ? 3 : r;
}

export type TierStatus =
  "open" | "waiting_on_them" | "waiting_on_you" | "waiting_on_both" | "needs_verification";

export function tierStatus(
  tier: Tier,
  mine: readonly string[],
  theirs: readonly string[],
  meVerified: boolean,
  themVerified: boolean,
): TierStatus {
  const rank = TIERS.indexOf(tier) + 1;
  const iIn = contiguousRank(mine) >= rank;
  const theyIn = contiguousRank(theirs) >= rank;
  if (iIn && theyIn) {
    if (tier === "Unhinged" && !(meVerified && themVerified)) return "needs_verification";
    return "open";
  }
  if (iIn) return "waiting_on_them";
  if (theyIn) return "waiting_on_you";
  return "waiting_on_both";
}

/** DARK-06 cooldown: 12 h after a decline. */
export const REQUEST_COOLDOWN_MS = 12 * 3600 * 1000;
export function requestBlockedUntil(lastDeclineAt: string | null, now = Date.now()): number | null {
  if (!lastDeclineAt) return null;
  const until = new Date(lastDeclineAt).getTime() + REQUEST_COOLDOWN_MS;
  return until > now ? until : null;
}
