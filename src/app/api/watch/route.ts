import { z } from "zod";
import { handler, ok, parseJson, requireCouple, deny, rateLimit } from "@/lib/server/api";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { youtubeId } from "@/lib/youtube";
import { notify } from "@/lib/server/push";

/** TOG-01: start a watch party from a YouTube link. */
export const POST = handler(async (req) => {
  const { user, coupleId, partnerId } = await requireCouple();
  await rateLimit(`watch:${user.id}`, 30, 3600);
  const { url } = await parseJson(req, z.object({ url: z.string().min(5).max(500) }));
  const vid = youtubeId(url);
  if (!vid) throw deny(422, "bad_link", "Paste a YouTube link.");
  let title: string | null = null;
  try {
    const r = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${vid}&format=json`,
      { signal: AbortSignal.timeout(3000) },
    );
    if (r.ok) title = ((await r.json()).title as string).slice(0, 200);
  } catch {
    /* title is optional */
  }
  const admin = supabaseAdmin();
  await admin
    .from("watch_sessions")
    .update({ ended_at: new Date().toISOString() })
    .eq("couple_id", coupleId)
    .eq("kind", "watch")
    .is("ended_at", null);
  const { data, error } = await admin
    .from("watch_sessions")
    .insert({ couple_id: coupleId, video_id: vid, title, created_by: user.id })
    .select("id")
    .single();
  if (error) throw error;
  const isFirst =
    (
      await admin
        .from("watch_sessions")
        .select("id", { count: "exact", head: true })
        .eq("couple_id", coupleId)
    ).count === 1;
  if (isFirst) {
    await admin.from("timeline_entries").upsert(
      {
        couple_id: coupleId,
        kind: "auto",
        title: `First watch party${title ? `: ${title}` : ""}`,
        happened_on: new Date().toISOString().slice(0, 10),
        source_key: "first-watch",
      },
      { onConflict: "couple_id,source_key" },
    );
  }
  const { data: me } = await admin
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .single();
  await notify(partnerId, "dates", {
    body: `${me?.display_name ?? "Your person"} started a watch party`,
    url: `/plans/watch/${data.id}`,
  });
  return ok({ id: data.id }, { status: 201 });
});
