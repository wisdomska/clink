import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { activeCouple } from "@/lib/server/api";

export type Step = "dob" | "profile" | "link" | "app";

/** Where a signed-in user belongs right now. */
export async function journeyStep(userId: string): Promise<Step> {
  const admin = supabaseAdmin();
  const [{ data: priv }, { data: profile }] = await Promise.all([
    admin.from("user_private").select("user_id").eq("user_id", userId).maybeSingle(),
    admin.from("profiles").select("onboarded_at").eq("id", userId).maybeSingle(),
  ]);
  if (!priv) return "dob";
  if (!profile?.onboarded_at) return "profile";
  if (!(await activeCouple(userId))) return "link";
  return "app";
}

export function pathFor(step: Step, next?: string | null): string {
  if (step === "dob" || step === "profile") return "/onboarding";
  if (step === "link") return next?.startsWith("/link") ? next : "/link";
  if (next && next.startsWith("/") && !next.startsWith("//")) return next;
  return "/us";
}

/**
 * Where to send someone right after they sign in to Clink. The admin portal
 * has its own sign-in at /admin, so admins land in the app like anyone else.
 */
export async function landingFor(userId: string, next?: string | null): Promise<string> {
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : null;
  return pathFor(await journeyStep(userId), safeNext);
}
