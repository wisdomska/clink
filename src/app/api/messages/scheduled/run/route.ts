import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { serverEnv } from "@/lib/env";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { activeCouple } from "@/lib/server/api";
import { notify } from "@/lib/server/push";

export const maxDuration = 60;

function authorised(req: NextRequest): boolean {
  const secret = serverEnv().CRON_SECRET;
  const given = req.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  if (!secret || given.length !== secret.length) return false;
  return timingSafeEqual(Buffer.from(given), Buffer.from(secret));
}

/**
 * Delivers due scheduled messages. Called every minute by pg_cron (see the
 * scheduled_messages migration). Each row is claimed atomically, inserted with
 * its client_id (so a retry never sends twice), then the partner gets a push.
 */
export async function POST(req: NextRequest) {
  if (!authorised(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const admin = supabaseAdmin();
  const { data: due, error } = await admin.rpc("svc_claim_scheduled_messages", { p_limit: 100 });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let sent = 0;
  let failed = 0;
  const names = new Map<string, string>();
  for (const s of due ?? []) {
    try {
      // Only while the sender is still linked to the same partner.
      const couple = await activeCouple(s.sender_id);
      if (!couple || couple.coupleId !== s.couple_id) {
        await admin.from("scheduled_messages").update({ status: "failed" }).eq("id", s.id);
        failed++;
        continue;
      }
      let replyTo = s.reply_to;
      if (replyTo) {
        const { data: r } = await admin
          .from("messages")
          .select("id, removed_at")
          .eq("id", replyTo)
          .eq("couple_id", s.couple_id)
          .maybeSingle();
        if (!r) replyTo = null;
      }
      let messageId: string | null = null;
      const ins = await admin
        .from("messages")
        .insert({
          couple_id: s.couple_id,
          sender_id: s.sender_id,
          client_id: s.client_id,
          type: "text",
          body: s.body,
          reply_to: replyTo,
        })
        .select("id")
        .single();
      if (ins.error) {
        if (ins.error.code !== "23505") throw ins.error;
        const { data: dup } = await admin
          .from("messages")
          .select("id")
          .eq("sender_id", s.sender_id)
          .eq("client_id", s.client_id)
          .single();
        messageId = dup?.id ?? null;
      } else messageId = ins.data.id;
      await admin
        .from("scheduled_messages")
        .update({ status: "sent", message_id: messageId, sent_at: new Date().toISOString() })
        .eq("id", s.id);
      sent++;
      if (!names.has(s.sender_id)) {
        const { data: p } = await admin
          .from("profiles")
          .select("display_name")
          .eq("id", s.sender_id)
          .single();
        names.set(s.sender_id, p?.display_name ?? "Your partner");
      }
      await notify(
        couple.partnerId,
        "chat",
        { body: `${names.get(s.sender_id)}: ${s.body.slice(0, 80)}`, url: "/chat", tag: "chat" },
        `sched:${s.id}`,
      );
    } catch (e) {
      console.error("[scheduled-messages]", s.id, e);
      failed++;
    }
  }
  return NextResponse.json(
    { claimed: due?.length ?? 0, sent, failed },
    { headers: { "Cache-Control": "no-store" } },
  );
}
