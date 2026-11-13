import { handler, ok, requireCouple, deny } from "@/lib/server/api";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { storage, limits } from "@/lib/storage";
import { stripImage } from "@/lib/server/images";
import { uuid } from "@/lib/validation";

/** Upload finished: verify the object, strip image metadata server-side (SAF-03), mark ready. */
export const POST = handler(async (_req, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  if (!uuid.safeParse(id).success) throw deny(404, "not_found", "Not found.");
  const { user, coupleId } = await requireCouple();
  const admin = supabaseAdmin();
  const { data: m } = await admin.from("media").select("*").eq("id", id).maybeSingle();
  if (!m || m.owner_id !== user.id || m.couple_id !== coupleId)
    throw deny(404, "not_found", "Not found.");
  if (m.status === "ready") return ok({ id, status: "ready" });
  const s = await storage();
  const bucket = m.bucket as "media" | "sensitive";
  const size = await s.size(bucket, m.storage_path);
  if (size === null) throw deny(409, "not_uploaded", "The upload didn't arrive. Try again.");
  if (size > limits(s.driver)[m.kind as "image" | "video" | "audio"]) {
    await s.remove(bucket, [m.storage_path]);
    await admin
      .from("media")
      .update({ status: "deleted", deleted_at: new Date().toISOString() })
      .eq("id", id);
    throw deny(413, "too_big", "That file is over the limit.");
  }
  let patch: {
    status: "ready";
    size_bytes: number;
    width?: number;
    height?: number;
    mime?: string;
  } = { status: "ready", size_bytes: size };
  if (m.kind === "image") {
    const raw = await s.read(bucket, m.storage_path);
    if (!raw) throw deny(409, "not_uploaded", "The upload didn't arrive. Try again.");
    try {
      const clean = await stripImage(raw);
      await s.write(bucket, m.storage_path, clean.data, "image/webp");
      patch = {
        status: "ready",
        size_bytes: clean.data.length,
        width: clean.width,
        height: clean.height,
        mime: "image/webp",
      };
    } catch {
      await s.remove(bucket, [m.storage_path]);
      await admin
        .from("media")
        .update({ status: "deleted", deleted_at: new Date().toISOString() })
        .eq("id", id);
      throw deny(415, "bad_image", "That file isn't an image we can read.");
    }
  }
  await admin.from("media").update(patch).eq("id", id);
  return ok({ id, status: "ready" });
});
