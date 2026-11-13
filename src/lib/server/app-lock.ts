import "server-only";
import { cookies } from "next/headers";
import { sign, unsign } from "@/lib/server/crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";

/** CHAT-07: the app-open PIN. Unlocked state is a signed browser-session cookie. */
export const APP_LOCK_COOKIE = "clink_open";

export async function appLockEnabled(userId: string): Promise<boolean> {
  const { data } = await supabaseAdmin()
    .from("user_private")
    .select("app_pin_hash")
    .eq("user_id", userId)
    .maybeSingle();
  return Boolean(data?.app_pin_hash);
}

export async function setAppUnlocked(userId: string) {
  // No maxAge: the cookie ends with the browser session. The client relocks
  // after 5 minutes in the background.
  (await cookies()).set(APP_LOCK_COOKIE, sign(userId, "app-open"), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
  });
}

export async function clearAppUnlocked() {
  (await cookies()).delete(APP_LOCK_COOKIE);
}

export async function isAppUnlocked(userId: string): Promise<boolean> {
  return unsign((await cookies()).get(APP_LOCK_COOKIE)?.value, "app-open") === userId;
}

/** True within 10 minutes of a fresh sign-in: enough proof to drop a forgotten PIN. */
export function signedInRecently(lastSignInAt: string | null | undefined, now = Date.now()) {
  const last = lastSignInAt ? new Date(lastSignInAt).getTime() : 0;
  return now - last < 10 * 60 * 1000;
}
