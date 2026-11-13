import type { NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { handler, ok, requireUser, rateLimit, deny } from "@/lib/server/api";
import { storage } from "@/lib/storage";
import { stripImage } from "@/lib/server/images";
import { supabaseAdmin } from "@/lib/supabase/admin";

const MAX = 3 * 1024 * 1024;

/** Avatar photo: re-encoded server-side to a 512 px WebP with no metadata. */
export const POST = handler(async (req: NextRequest) => {
  const { user } = await requireUser();
  await rateLimit(`avatar:${user.id}`, 10, 3600);
  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > MAX) throw deny(413, "too_big", "That photo is too big. Try a smaller one.");
  const raw = Buffer.from(await req.arrayBuffer());
  if (raw.length === 0 || raw.length > MAX)
    throw deny(413, "too_big", "That photo is too big. Try a smaller one.");
  let clean;
  try {
    clean = await stripImage(raw, 512);
  } catch {
    throw deny(415, "bad_image", "That file isn't a photo we can read.");
  }
  const s = await storage();
  const admin = supabaseAdmin();
  const { data: prev } = await admin
    .from("profiles")
    .select("avatar_path")
    .eq("id", user.id)
    .single();
  const path = `avatars/${user.id}/${randomUUID()}.webp`;
  await s.write("media", path, clean.data, "image/webp");
  await admin
    .from("profiles")
    .update({ avatar_kind: "photo", avatar_path: path })
    .eq("id", user.id);
  if (prev?.avatar_path) await s.remove("media", [prev.avatar_path]).catch(() => undefined);
  return ok({ url: await s.presignRead("media", path, 3600) });
});
