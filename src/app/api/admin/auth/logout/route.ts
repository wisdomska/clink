import { handler, ok } from "@/lib/server/api";
import { endAdminSession } from "@/lib/server/admin-auth";

export const POST = handler(async () => {
  await endAdminSession();
  return ok({ ok: true });
});
