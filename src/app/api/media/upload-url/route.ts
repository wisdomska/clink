import { randomUUID } from "node:crypto";
import { z } from "zod";
import { handler, ok, parseJson, requireCouple, rateLimit, deny } from "@/lib/server/api";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { storage, limits } from "@/lib/storage";
import { MIME, MAX_DURATION, extFor, expiryFor, type Retention } from "@/lib/media-rules";
import { requireDark, bothAllowSaved } from "@/lib/server/dark";

const schema = z.object({
  kind: z.enum(["image", "video", "audio"]),
  mime: z.string().max(60),
  size: z.number().int().positive(),
  sensitive: z.boolean().default(false),
  retention: z.enum(["once", "24h", "7d", "vault"]).optional(),
  durationS: z.number().min(0).max(600).optional(),
  width: z.number().int().positive().max(8192).optional(),
  height: z.number().int().positive().max(8192).optional(),
  waveform: z.array(z.number().int().min(0).max(100)).max(64).optional(),
});

/** POST /api/media/upload-url: size and type limits; the sensitive flag routes to the private bucket. */
export const POST = handler(async (req) => {
  const body = await parseJson(req, schema);
  const caller = body.sensitive ? await requireDark({ minRank: 1 }) : await requireCouple();
  if (body.sensitive) {
    // SAF-06: the one-time screenshot notice must have been shown first.
    const { data: ds } = await supabaseAdmin()
      .from("dark_settings")
      .select("notice_seen_at")
      .eq("user_id", caller.user.id)
      .single();
    if (!ds?.notice_seen_at)
      throw deny(428, "notice_required", "They can still screenshot. Only send what feels right.");
  }
  await rateLimit(`upload:${caller.user.id}`, 200, 3600);
  const s = await storage();
  const cap = limits(s.driver)[body.kind];
  const base = body.mime.split(";")[0]!;
  if (!(MIME[body.kind] as readonly string[]).includes(base))
    throw deny(415, "bad_type", "That file type isn't supported.");
  if (body.size > cap)
    throw deny(413, "too_big", `That's over the ${Math.round(cap / 1024 / 1024)} MB limit.`);
  if (
    body.kind !== "image" &&
    body.durationS !== undefined &&
    body.durationS > MAX_DURATION[body.kind] + 0.5
  ) {
    throw deny(
      413,
      "too_long",
      body.kind === "video"
        ? "Videos can be up to 60 seconds."
        : "Voice notes can be up to 3 minutes.",
    );
  }

  let retention: Retention = body.sensitive ? (body.retention ?? "vault") : "keep";
  if (retention === "vault" && !(await bothAllowSaved(caller.coupleId))) retention = "once"; // couple setting decides
  const id = randomUUID();
  const bucket = body.sensitive ? "sensitive" : "media";
  const path = `${caller.coupleId}/${body.kind}/${id}.${extFor(base)}`;
  const { error } = await supabaseAdmin()
    .from("media")
    .insert({
      id,
      couple_id: caller.coupleId,
      owner_id: caller.user.id,
      kind: body.kind,
      bucket,
      storage_path: path,
      mime: base,
      size_bytes: body.size,
      duration_s: body.durationS ?? null,
      width: body.width ?? null,
      height: body.height ?? null,
      waveform: body.waveform ?? null,
      is_sensitive: body.sensitive,
      retention,
      expires_at: expiryFor(retention),
    });
  if (error) throw error;
  const upload = await s.presignUpload(bucket, path, base, body.size);
  return ok({ id, retention, upload });
});
