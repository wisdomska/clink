import { z } from "zod";
import { randomUUID } from "node:crypto";
import { handler, ok, parseJson, requireCouple, rateLimit } from "@/lib/server/api";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { notify } from "@/lib/server/push";

/**
 * Writes a call into the chat (WhatsApp style): "Missed video call",
 * "Voice call · 4:12". Logged once, by the caller, when the call ends.
 * Body format: call:<outcome>:<voice|video>:<seconds>
 */
export const POST = handler(async (req) => {
  const { user, coupleId, partnerId } = await requireCouple();
  await rateLimit(`call-log:${user.id}`, 60, 3600);
  const { outcome, video, seconds } = await parseJson(
    req,
    z.object({
      outcome: z.enum(["missed", "declined", "ended", "failed"]),
      video: z.boolean(),
      seconds: z.number().int().min(0).max(86_400).default(0),
    }),
  );
  const admin = supabaseAdmin();
  const { error } = await admin.from("messages").insert({
    couple_id: coupleId,
    sender_id: user.id,
    client_id: randomUUID(),
    type: "system",
    body: `call:${outcome}:${video ? "video" : "voice"}:${seconds}`,
  });
  if (error) throw error;
  if (outcome === "missed") {
    const { data: me } = await admin
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .single();
    await notify(partnerId, "chat", {
      body: `Missed ${video ? "video " : ""}call from ${me?.display_name ?? "your partner"}`,
      url: "/chat",
      tag: "call",
    });
  }
  return ok({ ok: true });
});
