import { z } from "zod";
import { handler, ok, parseJson, requireCouple } from "@/lib/server/api";
import { supabaseAdmin } from "@/lib/supabase/admin";

const schema = z.object({
  started_on: z.iso.date().nullable().optional(),
  chat_theme: z
    .enum(["clink", "sunset", "ocean", "forest", "berry", "mono", "candy", "midnight"])
    .optional(),
  chat_wallpaper: z
    .enum(["none", "glow", "hearts", "stars", "dots", "waves", "aurora", "custom"])
    .optional(),
  chat_wallpaper_media: z.uuid().nullable().optional(),
  chat_wallpaper_blur: z.boolean().optional(),
});

/** ACC-06 relationship start date (drives the day counter and timeline). Ritual time: ./ritual-time. */
export const PATCH = handler(async (req) => {
  const { db, coupleId } = await requireCouple();
  const { chat_theme, chat_wallpaper, chat_wallpaper_media, chat_wallpaper_blur, ...body } =
    await parseJson(req, schema);
  if (
    chat_theme ||
    chat_wallpaper ||
    chat_wallpaper_media !== undefined ||
    chat_wallpaper_blur !== undefined
  ) {
    const look: {
      chat_theme?: string;
      chat_wallpaper?: string;
      chat_wallpaper_media?: string | null;
      chat_wallpaper_blur?: boolean;
    } = {};
    if (chat_theme) look.chat_theme = chat_theme;
    if (chat_wallpaper) look.chat_wallpaper = chat_wallpaper;
    if (chat_wallpaper_blur !== undefined) look.chat_wallpaper_blur = chat_wallpaper_blur;
    if (chat_wallpaper_media !== undefined) {
      if (chat_wallpaper_media) {
        // Must be a finished, non-private photo in this couple.
        const { data: m } = await supabaseAdmin()
          .from("media")
          .select("couple_id, kind, is_sensitive, status")
          .eq("id", chat_wallpaper_media)
          .maybeSingle();
        if (
          !m ||
          m.couple_id !== coupleId ||
          m.kind !== "image" ||
          m.is_sensitive ||
          m.status !== "ready"
        )
          return Response.json({ message: "That photo isn't ready yet." }, { status: 422 });
      }
      look.chat_wallpaper_media = chat_wallpaper_media;
    }
    const { error: e } = await supabaseAdmin().from("couples").update(look).eq("id", coupleId);
    if (e) throw e;
    if (!("started_on" in body)) return ok({ ok: true });
  }
  if (body.started_on && body.started_on > new Date().toISOString().slice(0, 10))
    body.started_on = null;
  const { error } = await db.from("couples").update(body).eq("id", coupleId);
  if (error) throw error;
  if (body.started_on) {
    await supabaseAdmin().from("timeline_entries").upsert(
      {
        couple_id: coupleId,
        kind: "auto",
        title: "Where it started.",
        happened_on: body.started_on,
        source_key: "started",
      },
      { onConflict: "couple_id,source_key" },
    );
  }
  return ok({ ok: true });
});
