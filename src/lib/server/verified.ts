import "server-only";
import type { User } from "@supabase/supabase-js";

/** ACC-01: unverified users cannot link. Email confirmed, Google, or a passkey counts. */
export function isVerified(user: User): boolean {
  if (user.email_confirmed_at) return true;
  const providers = (user.identities ?? []).map((i) => i.provider);
  if (providers.includes("google")) return true;
  const factors = (user.factors ?? []) as Array<{ factor_type?: string; status?: string }>;
  return factors.some((f) => f.factor_type === "webauthn" && f.status === "verified");
}
