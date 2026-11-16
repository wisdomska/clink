import { z } from "zod";
import { handler, ok, requireCouple, rateLimit, deny } from "@/lib/server/api";
import { supabaseAdmin } from "@/lib/supabase/admin";

/** Cancel a scheduled message before it goes out. */
export const DELETE = handler(async (_req, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) throw deny(404, "not_found", "Not found.");
  const { user, coupleId } = await requireCouple();
  await rateLimit(`msg-sched:${user.id}`, 120, 3600);
  // Atomic: only a row that is still waiting can be cancelled.
  const admin = supabaseAdmin();
  const { data } = await admin
    .from("scheduled_messages")
    .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
    .eq("id", id)
    .eq("sender_id", user.id)
    .eq("couple_id", coupleId)
    .eq("status", "scheduled")
    .select("id")
    .maybeSingle();
  if (!data) {
    const { data: row } = await admin
      .from("scheduled_messages")
      .select("status")
      .eq("id", id)
      .eq("sender_id", user.id)
      .maybeSingle();
    if (!row) throw deny(404, "not_found", "Not found.");
    throw deny(
      409,
      "not_waiting",
      row.status === "cancelled" ? "Already cancelled." : "Too late, that one has already gone.",
    );
  }
  return ok({ ok: true });
});
