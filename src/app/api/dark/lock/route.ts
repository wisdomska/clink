import { handler, ok } from "@/lib/server/api";
import { clearDarkSession } from "@/lib/server/dark";

export const POST = handler(async () => {
  await clearDarkSession();
  return ok({ ok: true });
});
