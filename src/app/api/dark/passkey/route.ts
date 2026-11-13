import { z } from "zod";
import { cookies } from "next/headers";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import { handler, ok, parseJson, requireCouple, deny, rateLimit, audit } from "@/lib/server/api";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireDark, setDarkSession } from "@/lib/server/dark";
import { sign, unsign } from "@/lib/server/crypto";
import type { Json } from "@/types/database";

const CHALLENGE = "clink_dark_chal";

function rp(req: Request) {
  const u = new URL(req.headers.get("origin") ?? req.url);
  return { rpID: u.hostname, origin: u.origin };
}

interface StoredCred {
  id: string;
  publicKey: string;
  counter: number;
  transports?: string[];
}

/**
 * After Dark passkey (DARK-01, preferred over the PIN).
 * action "register-options" / "register" need an unlocked session (PIN first);
 * "auth-options" / "auth" unlock After Dark.
 */
export const POST = handler(async (req) => {
  const body = await parseJson(
    req,
    z.object({
      action: z.enum(["register-options", "register", "auth-options", "auth"]),
      response: z.unknown().optional(),
    }),
  );
  const store = await cookies();
  const { rpID, origin } = rp(req);
  const admin = supabaseAdmin();

  if (body.action === "register-options" || body.action === "register") {
    const d = await requireDark();
    if (body.action === "register-options") {
      const opts = await generateRegistrationOptions({
        rpName: "Clink",
        rpID,
        userName: `after-dark-${d.user.id.slice(0, 8)}`,
        userDisplayName: "After Dark",
        attestationType: "none",
        authenticatorSelection: { residentKey: "preferred", userVerification: "required" },
      });
      store.set(CHALLENGE, sign(`${d.user.id}|${opts.challenge}`, "dark-passkey"), {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        maxAge: 300,
        path: "/",
      });
      return ok(opts);
    }
    const [uid, challenge] = unsign(store.get(CHALLENGE)?.value, "dark-passkey")?.split("|") ?? [];
    if (uid !== d.user.id || !challenge)
      throw deny(400, "expired", "That took too long. Try again.");
    const v = await verifyRegistrationResponse({
      response: body.response as never,
      expectedChallenge: challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: true,
    });
    if (!v.verified || !v.registrationInfo)
      throw deny(400, "not_verified", "That passkey didn't verify.");
    const c = v.registrationInfo.credential;
    const cred: StoredCred = {
      id: c.id,
      publicKey: Buffer.from(c.publicKey).toString("base64url"),
      counter: c.counter,
      transports: c.transports,
    };
    await admin
      .from("dark_settings")
      .update({ passkey_credential: cred as unknown as Json })
      .eq("user_id", d.user.id);
    store.delete(CHALLENGE);
    await audit("dark_passkey_added", d.user.id);
    return ok({ ok: true });
  }

  const { user } = await requireCouple();
  await rateLimit(`dark-passkey:${user.id}`, 30, 900);
  const { data: s } = await admin
    .from("dark_settings")
    .select("passkey_credential")
    .eq("user_id", user.id)
    .maybeSingle();
  const cred = s?.passkey_credential as unknown as StoredCred | null;
  if (!cred) throw deny(409, "no_passkey", "No passkey for After Dark on this account yet.");
  if (body.action === "auth-options") {
    const opts = await generateAuthenticationOptions({
      rpID,
      allowCredentials: [{ id: cred.id, transports: cred.transports as never }],
      userVerification: "required",
    });
    store.set(CHALLENGE, sign(`${user.id}|${opts.challenge}`, "dark-passkey"), {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      maxAge: 300,
      path: "/",
    });
    return ok(opts);
  }
  const [uid, challenge] = unsign(store.get(CHALLENGE)?.value, "dark-passkey")?.split("|") ?? [];
  if (uid !== user.id || !challenge) throw deny(400, "expired", "That took too long. Try again.");
  const v = await verifyAuthenticationResponse({
    response: body.response as never,
    expectedChallenge: challenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    requireUserVerification: true,
    credential: {
      id: cred.id,
      publicKey: Buffer.from(cred.publicKey, "base64url"),
      counter: cred.counter,
      transports: cred.transports as never,
    },
  });
  if (!v.verified) throw deny(401, "not_verified", "That passkey didn't work.");
  await admin
    .from("dark_settings")
    .update({
      passkey_credential: { ...cred, counter: v.authenticationInfo.newCounter } as unknown as Json,
    })
    .eq("user_id", user.id);
  store.delete(CHALLENGE);
  await setDarkSession(user.id);
  await audit("dark_unlock", user.id, { method: "passkey" });
  return ok({ ok: true });
});
