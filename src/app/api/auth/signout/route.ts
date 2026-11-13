import { z } from "zod";
import { handler, ok, parseJson, requireUser, audit } from "@/lib/server/api";
import { clearDarkSession } from "@/lib/server/dark";

/** Sign out here, or everywhere (ACC-09: revokes every refresh token). */
export const POST = handler(async (req) => {
  const { user, db } = await requireUser();
  const { everywhere } = await parseJson(req, z.object({ everywhere: z.boolean().default(false) }));
  await clearDarkSession();
  await db.auth.signOut({ scope: everywhere ? "global" : "local" });
  await audit(everywhere ? "signout_all" : "signout", user.id);
  return ok({ ok: true });
});
