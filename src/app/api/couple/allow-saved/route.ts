import { z } from "zod";
import { handler, ok, parseJson, requireCouple } from "@/lib/server/api";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { bothAllowSaved } from "@/lib/server/dark";

/** "Allow saved spicy media": both must agree; either turning it off makes future sends View once. */
export const POST = handler(async (req) => {
  const { user, coupleId } = await requireCouple();
  const { allow } = await parseJson(req, z.object({ allow: z.boolean() }));
  await supabaseAdmin()
    .from("couple_members")
    .update({ allow_saved_spicy: allow })
    .eq("couple_id", coupleId)
    .eq("user_id", user.id);
  return ok({ mine: allow, both: await bothAllowSaved(coupleId) });
});
