import { z } from "zod";
import { handler, ok, parseJson, requireCouple, rateLimit } from "@/lib/server/api";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { notify } from "@/lib/server/push";
import { track } from "@/lib/server/analytics";

const schema = z.object({
  kind: z.enum(["tap", "hold", "back"]),
  holdSeconds: z.number().int().min(0).max(3600).optional(),
  partnerOnline: z.boolean().optional(),
});

/**
 * HOME-01/02/03. The realtime broadcast already reached an online partner
 * (sub-second); this persists the Clink, answers the latest one for the
 * streak, and pushes when the partner is offline.
 */
export const POST = handler(async (req) => {
  const { user, coupleId, partnerId } = await requireCouple();
  await rateLimit(`clink:${user.id}`, 120, 3600);
  const body = await parseJson(req, schema);
  const admin = supabaseAdmin();
  let answered: string | null = null;
  if (body.kind === "back" || body.kind === "tap") {
    const { data } = await admin.rpc("svc_answer_latest_clink", {
      p_couple: coupleId,
      p_answerer: user.id,
    });
    answered = (data as string | null) ?? null;
  }
  const { data: row, error } = await admin
    .from("clinks")
    .insert({
      couple_id: coupleId,
      sender_id: user.id,
      kind: body.kind,
      hold_seconds: body.kind === "hold" ? (body.holdSeconds ?? 0) : null,
      answers: answered,
    })
    .select("id, created_at")
    .single();
  if (error) throw error;
  if (body.kind === "hold" && (body.holdSeconds ?? 0) < 1) return ok({ id: row.id });
  // A quiet system line in chat ("Theo sent a Clink, 21:02").
  await admin.from("messages").insert({
    couple_id: coupleId,
    sender_id: user.id,
    client_id: `clink-${row.id}`,
    type: "clink",
    body: body.kind === "hold" ? `hold:${body.holdSeconds ?? 0}` : body.kind,
  });

  if (!body.partnerOnline && body.kind !== "hold") {
    const { data: me } = await admin
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .single();
    await notify(partnerId, "clinks", {
      body: `${me?.display_name ?? "Your person"} sent a Clink`,
      url: "/us?clink=1",
      tag: "clink",
    });
  }
  await track(answered ? "clink_answered" : "clink_sent", user.id, { kind: body.kind }, coupleId);
  return ok({ id: row.id, answered: Boolean(answered) });
});
