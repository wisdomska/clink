import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import type { EmailOtpType } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { unsign } from "@/lib/server/crypto";
import { journeyStep, pathFor } from "@/lib/server/journey";
import { audit } from "@/lib/server/api";

/** Email links (PKCE code or token hash) and Google OAuth land here. */
export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const next = url.searchParams.get("next");
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const db = await supabaseServer();

  let error: string | null = null;
  if (code) {
    error = (await db.auth.exchangeCodeForSession(code)).error?.message ?? null;
  } else if (tokenHash && type) {
    error = (await db.auth.verifyOtp({ token_hash: tokenHash, type })).error?.message ?? null;
  } else {
    error = "missing_code";
  }
  if (error) {
    return NextResponse.redirect(new URL(`/login?error=link`, url.origin));
  }

  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return NextResponse.redirect(new URL(`/login?error=link`, url.origin));

  // Turn the signed age-gate cookie into the private DOB row (never shown to the partner).
  const store = await cookies();
  const age = unsign(store.get("clink_age")?.value, "age");
  if (age) {
    const [dob, exp] = age.split("|");
    if (dob && Number(exp) > Date.now()) {
      await supabaseAdmin()
        .from("user_private")
        .upsert({ user_id: user.id, dob }, { onConflict: "user_id", ignoreDuplicates: true });
    }
    store.delete("clink_age");
  }
  await audit("login", user.id, { method: code ? "code" : "otp" });

  const step = await journeyStep(user.id);
  return NextResponse.redirect(new URL(pathFor(step, next), url.origin));
}
