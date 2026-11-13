import { randomUUID } from "node:crypto";
import { handler, ok, requireUser, rateLimit, deny } from "@/lib/server/api";
import { storage } from "@/lib/storage";
import { stripImage } from "@/lib/server/images";

/** A screenshot the reporter chooses to attach. The only content an admin can ever see. */
export const POST = handler(async (req) => {
  const { user } = await requireUser();
  await rateLimit(`report-att:${user.id}`, 10, 3600);
  const raw = Buffer.from(await req.arrayBuffer());
  if (!raw.length || raw.length > 8 * 1024 * 1024) throw deny(413, "too_big", "That image is too big.");
  const clean = await stripImage(raw, 1600).catch(() => {
    throw deny(415, "bad_image", "That isn't an image we can read.");
  });
  const path = `reports/${user.id}/${randomUUID()}.webp`;
  await (await storage()).write("media", path, clean.data, "image/webp");
  return ok({ path });
});
