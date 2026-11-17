import { z } from "zod";
import { handler, ok, parseJson, deny } from "@/lib/server/api";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireDark } from "@/lib/server/dark";
import { REQUEST_COOLDOWN_MS } from "@/lib/dark-logic";

/**
 * POST /api/dark/requests/:id. The recipient answers: Accept, Not right now
 * (12 h cooldown) or Later (inbox, no reminders). The requester can take an
 * unanswered request back ("cancel"), with no cooldown.
 */
export const POST = handler(async (req, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const { response } = await parseJson(
    req,
    z.object({ response: z.enum(["accept", "decline", "later", "cancel"]) }),
  );
  const admin = supabaseAdmin();
  const [d, { data: r }] = await Promise.all([
    requireDark({ minRank: 4 }),
    admin
      .from("nude_requests")
      .select("couple_id, requester_id, recipient_id, status")
      .eq("id", id)
      .maybeSingle(),
  ]);
  if (!r || r.couple_id !== d.coupleId) throw deny(404, "not_found", "Not found.");
  if (response === "cancel") {
    if (r.requester_id !== d.user.id)
      throw deny(403, "not_requester", "Only you can take it back.");
    if (!["pending", "later"].includes(r.status))
      throw deny(409, "answered", "They've already answered.");
    await admin.from("nude_requests").update({ status: "cancelled" }).eq("id", id);
    return ok({ ok: true });
  }
  if (r.recipient_id !== d.user.id) throw deny(403, "not_recipient", "Only they can answer this.");
  if (!["pending", "later"].includes(r.status)) throw deny(409, "answered", "Already answered.");
  const now = new Date();
  await admin
    .from("nude_requests")
    .update({
      status: response === "accept" ? "accepted" : response === "decline" ? "declined" : "later",
      responded_at: now.toISOString(),
      cooldown_until:
        response === "decline" ? new Date(now.getTime() + REQUEST_COOLDOWN_MS).toISOString() : null,
    })
    .eq("id", id);
  return ok({ ok: true });
});
