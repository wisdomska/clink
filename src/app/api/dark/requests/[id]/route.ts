import { z } from "zod";
import { handler, ok, parseJson, deny } from "@/lib/server/api";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireDark } from "@/lib/server/dark";
import { REQUEST_COOLDOWN_MS } from "@/lib/dark-logic";

/** POST /api/dark/requests/:id: recipient only. Accept, Not right now (12 h cooldown), or Later (inbox, no reminders). */
export const POST = handler(async (req, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const d = await requireDark({ minRank: 4 });
  const { response } = await parseJson(
    req,
    z.object({ response: z.enum(["accept", "decline", "later"]) }),
  );
  const admin = supabaseAdmin();
  const { data: r } = await admin
    .from("nude_requests")
    .select("couple_id, recipient_id, status")
    .eq("id", id)
    .maybeSingle();
  if (!r || r.couple_id !== d.coupleId) throw deny(404, "not_found", "Not found.");
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
