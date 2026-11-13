import type { NextRequest } from "next/server";
import { handler, requireUser, deny } from "@/lib/server/api";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { storage } from "@/lib/storage";
import { watermark } from "@/lib/server/images";
import { loadReadableMedia } from "@/lib/server/media-access";
import { hasDarkSession, setDarkSession } from "@/lib/server/dark";
import { uuid } from "@/lib/validation";
import { formatClock } from "@/lib/time";

const NO_STORE = { "Cache-Control": "no-store, max-age=0, private", Pragma: "no-cache", "X-Robots-Tag": "noindex" };

/**
 * GET /api/media/:id/view
 * Ordinary media: 302 to a short-lived signed URL.
 * Sensitive media: caller in couple, After Dark session live, View once not
 * yet consumed, not expired. Bytes are streamed (never a reusable URL),
 * no-store, and images are watermarked with the viewer's name and time.
 */
export const GET = handler(async (_req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  if (!uuid.safeParse(id).success) throw deny(404, "not_found", "Not found.");
  const { user } = await requireUser();
  const m = await loadReadableMedia(id, user.id);
  const s = await storage();

  if (!m.is_sensitive) {
    const url = await s.presignRead("media", m.storage_path, 600);
    return new Response(null, { status: 302, headers: { Location: url, "Cache-Control": "private, max-age=300" } });
  }

  if (!(await hasDarkSession(user.id))) throw deny(401, "dark_locked", "After Dark is locked.");
  await setDarkSession(user.id);
  const admin = supabaseAdmin();
  if (m.retention === "once") {
    if (m.owner_id === user.id) throw deny(403, "once_sender", "View once items open only for them.");
    if (m.closed_at) throw deny(410, "viewed", "Opened. It's gone now.");
    if (!m.viewed_at) {
      await admin.from("media").update({ viewed_at: new Date().toISOString(), view_count: m.view_count + 1 }).eq("id", id);
    }
  } else {
    await admin.from("media").update({ view_count: m.view_count + 1 }).eq("id", id);
  }
  await admin.from("sensitive_view_events").insert({ media_id: id, couple_id: m.couple_id, viewer_id: user.id, event: "reveal" });

  const raw = await s.read("sensitive", m.storage_path);
  if (!raw) throw deny(410, "gone", "This is no longer available.");
  let body: Buffer = raw;
  let type = m.mime;
  if (m.kind === "image") {
    const { data: me } = await admin.from("profiles").select("display_name, timezone").eq("id", user.id).single();
    body = await watermark(raw, `${me?.display_name ?? "viewer"} · ${formatClock(new Date(), me?.timezone ?? "UTC")}`);
    type = "image/webp";
  }
  return new Response(new Uint8Array(body), { status: 200, headers: { ...NO_STORE, "Content-Type": type, "Content-Length": String(body.length) } });
});
