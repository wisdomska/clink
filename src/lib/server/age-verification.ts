import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { hmac } from "@/lib/server/crypto";
import { isAdult } from "@/lib/age";

/**
 * Provider-agnostic age verification (SAF-01). Paid ID-and-selfie providers
 * are out of budget, so SelfAttestAdapter ships now and ProviderAdapter is a
 * stub with the same interface. See docs/LIMITS.md.
 */
export interface AgeVerification {
  readonly method: "self_attest" | "provider";
  start(
    userId: string,
    input: { declaration: string },
  ): Promise<{ status: "passed" | "failed" | "pending"; redirectUrl?: string; reason?: string }>;
}

export const DECLARATION =
  "I confirm I am 18 or older, that every image I send is of me, and that I consent to receive adult content from my partner.";

export class SelfAttestAdapter implements AgeVerification {
  readonly method = "self_attest" as const;
  async start(userId: string, input: { declaration: string }) {
    const admin = supabaseAdmin();
    const { data: priv } = await admin
      .from("user_private")
      .select("dob")
      .eq("user_id", userId)
      .single();
    if (!priv) return { status: "failed" as const, reason: "no_dob" };
    if (!isAdult(new Date(`${priv.dob}T00:00:00Z`)))
      return { status: "failed" as const, reason: "under_18" };
    if (input.declaration !== DECLARATION)
      return { status: "failed" as const, reason: "declaration" };
    const signedAt = new Date().toISOString();
    const signature = hmac(`${userId}|${priv.dob}|${DECLARATION}|${signedAt}`, "age-declaration");
    await admin.from("age_verifications").insert({
      user_id: userId,
      method: "self_attest",
      status: "passed",
      declaration: DECLARATION,
      signature,
      signed_at: signedAt,
    });
    await admin
      .from("user_private")
      .update({ age_verified_at: signedAt, age_verification_method: "self_attest" })
      .eq("user_id", userId);
    return { status: "passed" as const };
  }
}

/** Placeholder for a real ID-and-selfie provider (Yoti, Veriff...). Not wired to any paid service. */
export class ProviderAdapter implements AgeVerification {
  readonly method = "provider" as const;
  async start(): Promise<{ status: "pending"; reason: string }> {
    return { status: "pending", reason: "provider_not_configured" };
  }
}

export function ageVerifier(): AgeVerification {
  return process.env.AGE_VERIFICATION_PROVIDER === "provider"
    ? new ProviderAdapter()
    : new SelfAttestAdapter();
}
