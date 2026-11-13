import { z } from "zod";
import { handler, ok, parseJson, deny, rateLimit } from "@/lib/server/api";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireDark } from "@/lib/server/dark";
import { notify } from "@/lib/server/push";
import { track } from "@/lib/server/analytics";

/**
 * DARK-07: deliver an uploaded sensitive item. It shows up blurred (SAF-02) in
 * chat and After Dark. Optionally completes a dare or answers a request.
 */
export const POST = handler(async (req) => {
  const d = await requireDark({ minRank: 1 });
  await rateLimit(`dsend:${d.user.id}`, 60, 3600);
  const body = await parseJson(
    req,
    z.object({ mediaId: z.uuid(), spinId: z.uuid().optional(), requestId: z.uuid().optional() }),
  );
  const admin = supabaseAdmin();
  const { data: m } = await admin
    .from("media")
    .select("owner_id, couple_id, is_sensitive, status, retention")
    .eq("id", body.mediaId)
    .maybeSingle();
  if (
    !m ||
    m.owner_id !== d.user.id ||
    m.couple_id !== d.coupleId ||
    !m.is_sensitive ||
    m.status !== "ready"
  )
    throw deny(422, "bad_media", "That didn't upload.");
  if (body.requestId) {
    const { data: r } = await admin
      .from("nude_requests")
      .select("recipient_id, status")
      .eq("id", body.requestId)
      .maybeSingle();
    if (!r || r.recipient_id !== d.user.id || r.status !== "accepted")
      throw deny(409, "bad_request", "That request isn't open.");
    if (d.rank < 4) throw deny(403, "tier_locked", "Unhinged isn't open for you both.");
    await admin
      .from("nude_requests")
      .update({ status: "fulfilled", media_id: body.mediaId })
      .eq("id", body.requestId);
    await admin.from("media").update({ request_id: body.requestId }).eq("id", body.mediaId);
  }
  if (body.spinId) {
    const { data: s } = await admin
      .from("dare_spins")
      .select("couple_id")
      .eq("id", body.spinId)
      .maybeSingle();
    if (s?.couple_id === d.coupleId) {
      await admin
        .from("dare_spins")
        .update({ outcome: "done", media_id: body.mediaId, resolved_at: new Date().toISOString() })
        .eq("id", body.spinId);
      await admin.from("media").update({ dare_spin_id: body.spinId }).eq("id", body.mediaId);
    }
  }
  await admin.from("messages").insert({
    couple_id: d.coupleId,
    sender_id: d.user.id,
    client_id: `dark-${body.mediaId}`,
    type: "sensitive",
    media_ids: [body.mediaId],
  });
  await notify(d.partnerId, "dark", { body: "" });
  await track("sensitive_media_sent", d.user.id, { retention: m.retention }, d.coupleId);
  return ok({ ok: true }, { status: 201 });
});
