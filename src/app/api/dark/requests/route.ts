import { z } from "zod";
import { handler, ok, parseJson, deny, rateLimit } from "@/lib/server/api";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireDark } from "@/lib/server/dark";
import { notify } from "@/lib/server/push";

/**
 * DARK-06 nude request. POST requires Unhinged unlocked for both (so both are
 * age-verified, SAF-01) and respects the 12 h cooldown after a decline.
 * No reminder notifications, ever.
 */
export const POST = handler(async (req) => {
  const d = await requireDark({ minRank: 4 });
  await rateLimit(`nreq:${d.user.id}`, 10, 3600);
  const { note } = await parseJson(req, z.object({ note: z.string().trim().max(120).optional() }));
  const admin = supabaseAdmin();
  const { data: last } = await admin.from("nude_requests").select("status, cooldown_until").eq("couple_id", d.coupleId).eq("requester_id", d.user.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (last?.cooldown_until && new Date(last.cooldown_until) > new Date()) throw deny(429, "cooldown", "Not right now. Requests are paused for a while.");
  const { data: open } = await admin.from("nude_requests").select("id").eq("couple_id", d.coupleId).eq("requester_id", d.user.id).in("status", ["pending", "later"]).limit(1);
  if (open?.length) throw deny(409, "pending", "Your last request is still with them. No rush.");
  const { data: r } = await admin.from("nude_requests").insert({ couple_id: d.coupleId, requester_id: d.user.id, recipient_id: d.partnerId, note: note ?? null }).select("id").single();
  await notify(d.partnerId, "dark", { body: "" });
  return ok({ id: r!.id }, { status: 201 });
});

/** GET: requests to me (pending or later) and the status of my latest one. A decline only ever reads "Not right now". */
export const GET = handler(async () => {
  const d = await requireDark({ minRank: 1 });
  const admin = supabaseAdmin();
  const [{ data: inbox }, { data: sent }] = await Promise.all([
    admin.from("nude_requests").select("id, note, status, created_at").eq("couple_id", d.coupleId).eq("recipient_id", d.user.id).in("status", ["pending", "later", "accepted"]).order("created_at", { ascending: false }).limit(10),
    admin.from("nude_requests").select("id, status, created_at, cooldown_until").eq("couple_id", d.coupleId).eq("requester_id", d.user.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  return ok({ rank: d.rank, inbox: inbox ?? [], sent: sent ? { id: sent.id, status: sent.status === "declined" ? "not_right_now" : sent.status, cooldown: Boolean(sent.cooldown_until && new Date(sent.cooldown_until) > new Date()) } : null });
});
