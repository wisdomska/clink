import { z } from "zod";
import { handler, ok, parseJson, requireUser, rateLimit, audit } from "@/lib/server/api";
import { supabaseAdmin } from "@/lib/supabase/admin";

const PASSWORD_RULES = z
  .string()
  .min(12, "Use at least 12 characters.")
  .max(200)
  .regex(/[a-z]/, "Add a lowercase letter.")
  .regex(/[A-Z]/, "Add a capital letter.")
  .regex(/[0-9]/, "Add a number.");

/** Set or change your password. Also clears a "must change" flag on temporary passwords. */
export const POST = handler(async (req) => {
  const { user, db } = await requireUser();
  await rateLimit(`password:${user.id}`, 10, 3600);
  const { password } = await parseJson(req, z.object({ password: PASSWORD_RULES }));
  // Through the user's own session, so this device stays signed in.
  const { error } = await db.auth.updateUser({ password });
  if (error)
    return Response.json(
      {
        message:
          error.code === "same_password"
            ? "That's the password you have now. Pick a new one."
            : error.code === "weak_password"
              ? "That password is too easy to guess. Try a longer one."
              : "That didn't save. Try again.",
      },
      { status: 400 },
    );
  if (user.app_metadata?.must_change_password) {
    const { error: e2 } = await supabaseAdmin().auth.admin.updateUserById(user.id, {
      app_metadata: { ...user.app_metadata, must_change_password: false },
    });
    if (e2) throw e2;
  }
  await audit("password_changed", user.id);
  return ok({ ok: true });
});
