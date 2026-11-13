import { z } from "zod";
import { handler, ok, parseJson, requireCouple, deny, rateLimit } from "@/lib/server/api";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { youtubeId } from "@/lib/youtube";

/** TOG-02: add a song to the shared queue (title fetched server-side). */
export const POST = handler(async (req) => {
  const { user, coupleId } = await requireCouple();
  await rateLimit(`listen:${user.id}`, 120, 3600);
  const { url } = await parseJson(req, z.object({ url: z.string().min(5).max(500) }));
  const vid = youtubeId(url);
  if (!vid) throw deny(422, "bad_link", "Paste a YouTube link.");
  let title: string | null = null;
  try {
    const r = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${vid}&format=json`, { signal: AbortSignal.timeout(3000) });
    if (r.ok) title = ((await r.json()).title as string).slice(0, 200);
  } catch {
    /* optional */
  }
  const admin = supabaseAdmin();
  const { data: last } = await admin.from("listen_queue").select("position").eq("couple_id", coupleId).order("position", { ascending: false }).limit(1).maybeSingle();
  await admin.from("listen_queue").insert({ couple_id: coupleId, video_id: vid, title, added_by: user.id, position: (last?.position ?? 0) + 1 });
  return ok({ ok: true }, { status: 201 });
});
