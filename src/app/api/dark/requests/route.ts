import { z } from "zod";
import { handler, ok, parseJson, deny, rateLimit } from "@/lib/server/api";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireDark } from "@/lib/server/dark";
import { notifyLater } from "@/lib/server/push";

/** How many of your requests can wait for an answer at once. */
const MAX_OPEN = 5;

/**
 * DARK-06 nude request. You can have several waiting (up to MAX_OPEN). POST requires Unhinged unlocked for both (so both are
 * age-verified, SAF-01) and respects the 12 h cooldown after a decline.
 * No reminder notifications, ever.
 */
export const POST = handler(async (req) => {
  const d = await requireDark({ minRank: 4 });
  await rateLimit(`nreq:${d.user.id}`, 10, 3600);
  const { note } = await parseJson(req, z.object({ note: z.string().trim().max(120).optional() }));
  const admin = supabaseAdmin();
  const { data: last } = await admin
    .from("nude_requests")
    .select("status, cooldown_until")
    .eq("couple_id", d.coupleId)
    .eq("requester_id", d.user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (last?.cooldown_until && new Date(last.cooldown_until) > new Date())
    throw deny(429, "cooldown", "Not right now. Requests are paused for a while.");
  const { count: openCount } = await admin
    .from("nude_requests")
    .select("id", { count: "exact", head: true })
    .eq("couple_id", d.coupleId)
    .eq("requester_id", d.user.id)
    .in("status", ["pending", "later"]);
  if ((openCount ?? 0) >= MAX_OPEN)
    throw deny(409, "too_many", `You have ${MAX_OPEN} waiting already. Give them a moment.`);
  const { data: r } = await admin
    .from("nude_requests")
    .insert({
      couple_id: d.coupleId,
      requester_id: d.user.id,
      recipient_id: d.partnerId,
      note: note ?? null,
    })
    .select("id")
    .single();
  notifyLater(d.partnerId, "dark", { body: "" });
  return ok({ id: r!.id }, { status: 201 });
});

/**
 * GET: requests to me (pending, later or accepted), my latest request, and my
 * recent requests with their notes so I can see, edit or take them back. A
 * decline only ever reads "Not right now".
 */
export const GET = handler(async () => {
  const d = await requireDark({ minRank: 1 });
  const admin = supabaseAdmin();
  const [{ data: inbox }, { data: mine }] = await Promise.all([
    admin
      .from("nude_requests")
      .select("id, note, status, created_at")
      .eq("couple_id", d.coupleId)
      .eq("recipient_id", d.user.id)
      .in("status", ["pending", "later", "accepted"])
      .order("created_at", { ascending: false })
      .limit(20),
    admin
      .from("nude_requests")
      .select("id, note, status, created_at, cooldown_until")
      .eq("couple_id", d.coupleId)
      .eq("requester_id", d.user.id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);
  const now = Date.now();
  const shown = (status: string) => (status === "declined" ? "not_right_now" : status);
  const latest = mine?.[0];
  const cooldownUntil = (mine ?? [])
    .map((r) => r.cooldown_until)
    .filter((c): c is string => Boolean(c) && Date.parse(c!) > now)
    .sort()
    .pop();
  return ok({
    rank: d.rank,
    inbox: inbox ?? [],
    sent: latest
      ? {
          id: latest.id,
          status: shown(latest.status),
          cooldown: Boolean(cooldownUntil),
        }
      : null,
    cooldownUntil: cooldownUntil ?? null,
    maxOpen: MAX_OPEN,
    mine: (mine ?? []).map((r) => ({
      id: r.id,
      note: r.note,
      status: shown(r.status),
      created_at: r.created_at,
    })),
  });
});
