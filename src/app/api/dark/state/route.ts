import { handler, ok, requireCouple } from "@/lib/server/api";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { hasDarkSession, effectiveRank, bothAllowSaved } from "@/lib/server/dark";

/**
 * What the lock screen and hub need. Reveals per-tier opt-in status (needed for
 * "Waiting on them"), never answers or content. Works while locked.
 */
export const GET = handler(async () => {
  const { user, coupleId, partnerId } = await requireCouple();
  const admin = supabaseAdmin();
  const [{ data: rows }, { data: privs }] = await Promise.all([
    admin
      .from("dark_settings")
      .select(
        "user_id, opted_tiers, opted_in_at, pin_hash, passkey_credential, notice_seen_at, pin_locked_until, updated_at",
      )
      .in("user_id", [user.id, partnerId]),
    admin
      .from("user_private")
      .select("user_id, age_verified_at")
      .in("user_id", [user.id, partnerId]),
  ]);
  const mine = rows?.find((r) => r.user_id === user.id);
  const theirs = rows?.find((r) => r.user_id === partnerId);
  const unlocked = await hasDarkSession(user.id);
  return ok({
    unlocked,
    rank: await effectiveRank(coupleId),
    allowSaved: await bothAllowSaved(coupleId),
    me: {
      setUp: Boolean(mine?.pin_hash),
      tiers: mine?.opted_tiers ?? [],
      passkey: Boolean(mine?.passkey_credential),
      noticeSeen: Boolean(mine?.notice_seen_at),
      verified: Boolean(privs?.find((p) => p.user_id === user.id)?.age_verified_at),
      lockedUntil:
        mine?.pin_locked_until && new Date(mine.pin_locked_until) > new Date()
          ? mine.pin_locked_until
          : null,
    },
    partner: {
      optedIn: Boolean(theirs?.opted_in_at),
      tiers: theirs?.opted_tiers ?? [],
      verified: Boolean(privs?.find((p) => p.user_id === partnerId)?.age_verified_at),
      changedAt: theirs?.updated_at ?? null,
    },
  });
});
