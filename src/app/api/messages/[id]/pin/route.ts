import { z } from "zod";
import { handler, ok, requireCouple, rateLimit, deny } from "@/lib/server/api";

const MAX_PINS = 10;
const PINNABLE = ["text", "voice", "media", "sticker"];
const idSchema = z.uuid();

async function target(ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!idSchema.safeParse(id).success) throw deny(404, "not_found", "That message is gone.");
  return id;
}

/** Pin a message for you both (max 10). Runs under the caller's RLS. */
export const POST = handler(async (_req, ctx: { params: Promise<{ id: string }> }) => {
  const id = await target(ctx);
  const { user, db, coupleId } = await requireCouple();
  await rateLimit(`msg-pin:${user.id}`, 120, 3600);
  const { data: m } = await db
    .from("messages")
    .select("id, couple_id, type, removed_at")
    .eq("id", id)
    .eq("couple_id", coupleId)
    .maybeSingle();
  if (!m || m.removed_at) throw deny(404, "not_found", "That message is gone.");
  if (!PINNABLE.includes(m.type)) throw deny(422, "not_pinnable", "That one can't be pinned.");

  const { data: existing } = await db
    .from("message_pins")
    .select("message_id, pinned_by, pinned_at")
    .eq("message_id", id)
    .maybeSingle();
  if (existing) return ok({ pin: existing });

  const { count } = await db
    .from("message_pins")
    .select("message_id", { count: "exact", head: true })
    .eq("couple_id", coupleId);
  if ((count ?? 0) >= MAX_PINS)
    throw deny(409, "too_many_pins", `You can pin up to ${MAX_PINS} messages. Unpin one first.`);

  const { data, error } = await db
    .from("message_pins")
    .insert({ message_id: id, couple_id: coupleId, pinned_by: user.id })
    .select("message_id, pinned_by, pinned_at")
    .single();
  if (error) {
    if (error.code === "P0001")
      throw deny(409, "too_many_pins", `You can pin up to ${MAX_PINS} messages. Unpin one first.`);
    if (error.code === "23505") return ok({ pin: { message_id: id } });
    throw error;
  }
  return ok({ pin: data }, { status: 201 });
});

/** Unpin (either partner can). */
export const DELETE = handler(async (_req, ctx: { params: Promise<{ id: string }> }) => {
  const id = await target(ctx);
  const { user, db, coupleId } = await requireCouple();
  await rateLimit(`msg-pin:${user.id}`, 120, 3600);
  const { error } = await db
    .from("message_pins")
    .delete()
    .eq("message_id", id)
    .eq("couple_id", coupleId);
  if (error) throw error;
  return ok({ ok: true });
});
