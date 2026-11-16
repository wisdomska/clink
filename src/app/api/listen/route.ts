import { z } from "zod";
import { handler, ok, parseJson, requireCouple, deny, rateLimit } from "@/lib/server/api";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  UNSUPPORTED_LINK,
  appleTitleFromRef,
  canonicalUrl,
  parseMusicLink,
  type MusicLink,
} from "@/features/plans/music-link";

const OEMBED: Partial<Record<MusicLink["service"], string>> = {
  youtube: "https://www.youtube.com/oembed?format=json&url=",
  spotify: "https://open.spotify.com/oembed?url=",
};

async function fetchTitle(link: MusicLink): Promise<string | null> {
  const base = OEMBED[link.service];
  if (base) {
    try {
      const r = await fetch(`${base}${encodeURIComponent(canonicalUrl(link))}`, {
        signal: AbortSignal.timeout(3000),
      });
      if (r.ok) {
        const t = (await r.json()).title;
        if (typeof t === "string" && t.trim()) return t.trim().slice(0, 200);
      }
    } catch {
      /* optional */
    }
  }
  return link.service === "apple_music" ? appleTitleFromRef(link.ref) : null;
}

/** TOG-02: add a YouTube, Spotify or Apple Music link to the shared queue (title fetched server-side). */
export const POST = handler(async (req) => {
  const { user, coupleId } = await requireCouple();
  await rateLimit(`listen:${user.id}`, 120, 3600);
  const { url } = await parseJson(req, z.object({ url: z.string().min(5).max(500) }));
  const link = parseMusicLink(url);
  if (!link) throw deny(422, "bad_link", UNSUPPORTED_LINK);
  const title = await fetchTitle(link);
  const admin = supabaseAdmin();
  const { data: last } = await admin
    .from("listen_queue")
    .select("position")
    .eq("couple_id", coupleId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  // `service` is added by migration 20261116000100; the generated types predate it.
  const row = {
    couple_id: coupleId,
    video_id: link.ref,
    service: link.service,
    title,
    added_by: user.id,
    position: (last?.position ?? 0) + 1,
  };
  const { data, error } = await admin
    .from("listen_queue")
    .insert(row as Omit<typeof row, "service">)
    .select("*")
    .single();
  if (error) throw deny(500, "insert_failed", "Couldn't add that. Try again.");
  return ok({ ok: true, item: data }, { status: 201 });
});
