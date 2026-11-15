import { cookies } from "next/headers";
import { handler, ok } from "@/lib/server/api";
import { clearDarkSession } from "@/lib/server/dark";
import { clearAppUnlocked } from "@/lib/server/app-lock";

/**
 * Step away from this account on this device WITHOUT signing it out, so it can
 * be switched back to later. Clears the device's session cookies and the
 * per-session After Dark and app-lock unlocks; the refresh token stays valid.
 */
export const POST = handler(async () => {
  await clearDarkSession();
  await clearAppUnlocked();
  const jar = await cookies();
  for (const c of jar.getAll()) if (c.name.startsWith("sb-")) jar.delete(c.name);
  return ok({ ok: true });
});
