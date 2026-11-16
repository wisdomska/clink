import { z } from "zod";
import { handler, ok, parseJson, requireCouple, rateLimit, deny } from "@/lib/server/api";
import { supabaseAdmin } from "@/lib/supabase/admin";

const MAX_PENDING = 50;
const MIN_AHEAD_MS = 60_000;
const MAX_AHEAD_MS = 366 * 24 * 3600 * 1000;

const schema = z.object({
  clientId: z.string().min(8).max(64),
  body: z.string().trim().min(1, "Say something first.").max(4000),
  sendAt: z.iso.datetime({ offset: true }),
  replyTo: z.uuid().optional(),
});

/** Your queue of messages waiting to send (only you can see it). */
export const GET = handler(async () => {
  const { user, db, coupleId } = await requireCouple();
  const { data, error } = await db
    .from("scheduled_messages")
    .select("id, client_id, body, send_at, reply_to, status, created_at")
    .eq("couple_id", coupleId)
    .eq("sender_id", user.id)
    .in("status", ["scheduled", "sending"])
    .order("send_at");
  if (error) throw error;
  return ok({ scheduled: data ?? [] });
});

/** Write now, send later. Text only; delivered by the cron route at send_at. */
export const POST = handler(async (req) => {
  const { user, db, coupleId } = await requireCouple();
  await rateLimit(`msg-sched:${user.id}`, 120, 3600);
  const m = await parseJson(req, schema);
  const at = new Date(m.sendAt).getTime();
  const now = Date.now();
  if (at < now + MIN_AHEAD_MS) throw deny(422, "too_soon", "Pick a time at least a minute away.");
  if (at > now + MAX_AHEAD_MS) throw deny(422, "too_far", "Pick a time within the next year.");

  const admin = supabaseAdmin();
  const { data: existing } = await admin
    .from("scheduled_messages")
    .select("id, client_id, body, send_at, reply_to, status, created_at")
    .eq("sender_id", user.id)
    .eq("client_id", m.clientId)
    .maybeSingle();
  if (existing) return ok({ scheduled: existing });

  const { count } = await admin
    .from("scheduled_messages")
    .select("id", { count: "exact", head: true })
    .eq("sender_id", user.id)
    .in("status", ["scheduled", "sending"]);
  if ((count ?? 0) >= MAX_PENDING)
    throw deny(409, "too_many", `You can have up to ${MAX_PENDING} messages waiting.`);

  if (m.replyTo) {
    const { data: r } = await db
      .from("messages")
      .select("id, type")
      .eq("id", m.replyTo)
      .eq("couple_id", coupleId)
      .maybeSingle();
    if (!r || r.type === "sensitive") throw deny(422, "bad_reply", "That message is gone.");
  }

  const { data, error } = await admin
    .from("scheduled_messages")
    .insert({
      couple_id: coupleId,
      sender_id: user.id,
      client_id: m.clientId,
      body: m.body,
      reply_to: m.replyTo ?? null,
      send_at: new Date(at).toISOString(),
    })
    .select("id, client_id, body, send_at, reply_to, status, created_at")
    .single();
  if (error) throw error;
  return ok({ scheduled: data }, { status: 201 });
});
