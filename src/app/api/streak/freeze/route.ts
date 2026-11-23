import { z } from "zod";
import { handler, ok, parseJson, requireCouple, rateLimit, deny } from "@/lib/server/api";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { notifyLater } from "@/lib/server/push";

const schema = z.object({ day: z.enum(["today", "yesterday"]) });

/** Use one of the couple's two monthly streak freezes, for today or yesterday. */
export const POST = handler(async (req) => {
  const { user, db, partnerId } = await requireCouple();
  await rateLimit(`streak-freeze:${user.id}`, 20, 3600);
  const { day } = await parseJson(req, schema);
  const { data: r, error } = await db.rpc("use_streak_freeze", { p_day: day });
  if (error) throw error;
  if (r === "already")
    throw deny(409, "already", `${day === "today" ? "Today" : "Yesterday"} is already frozen.`);
  if (r === "none_left") throw deny(409, "none_left", "You've both used this month's two freezes.");
  if (r !== "ok") throw deny(400, "bad_request", "That didn't work.");
  const { data: me } = await supabaseAdmin()
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .single();
  notifyLater(partnerId, "clinks", {
    body:
      day === "today"
        ? `${me?.display_name ?? "Your partner"} froze today, so your streak is safe.`
        : `${me?.display_name ?? "Your partner"} used a freeze: your streak is back.`,
    url: "/us",
    tag: "streak-freeze",
  });
  return ok({ frozen: day });
});
