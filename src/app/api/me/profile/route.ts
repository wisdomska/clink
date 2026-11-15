import type { NextRequest } from "next/server";
import { handler, ok, parseJson, requireUser } from "@/lib/server/api";
import { profileSchema } from "@/lib/validation";
import type { Database } from "@/types/database";

/** Onboarding and settings profile updates (ACC-03). RLS limits this to the caller's row. */
export const PATCH = handler(async (req: NextRequest) => {
  const { user, db } = await requireUser();
  const { finish, ...body } = await parseJson(req, profileSchema.partial());
  const patch: Database["public"]["Tables"]["profiles"]["Update"] = {
    ...body,
    phone: body.phone === "" ? null : body.phone,
  };
  // Picking one of the 3D faces switches back from a photo.
  if (body.avatar_icon) patch.avatar_kind = "icon";
  if (finish) patch.onboarded_at = new Date().toISOString();
  const { data, error } = await db
    .from("profiles")
    .update(patch)
    .eq("id", user.id)
    .select()
    .single();
  if (error) throw error;
  return ok({ profile: data });
});
