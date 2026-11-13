"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "@phosphor-icons/react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Display, Lead } from "@/components/ui/heading";
import { Input, FieldError } from "@/components/ui/field";

/** Mandatory TOTP two-factor for admins (Supabase Auth MFA). Enrol once, then verify each session. */
export function AdminMfa() {
  const router = useRouter();
  const [mode, setMode] = useState<"loading" | "enrol" | "verify">("loading");
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const sb = supabaseBrowser();
    void (async () => {
      const { data } = await sb.auth.mfa.listFactors();
      const totp = data?.totp?.find((f) => f.status === "verified");
      if (totp) {
        setFactorId(totp.id);
        setMode("verify");
        return;
      }
      for (const f of data?.all ?? [])
        if (f.status === "unverified") await sb.auth.mfa.unenroll({ factorId: f.id });
      const { data: en, error } = await sb.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: `Clink admin ${new Date().toISOString().slice(0, 10)}`,
      });
      if (error || !en) return setError(error?.message ?? "Couldn't start enrolment.");
      setFactorId(en.id);
      setQr(en.totp.qr_code);
      setSecret(en.totp.secret);
      setMode("enrol");
    })();
  }, []);

  async function verify() {
    if (!factorId) return;
    setError(null);
    const { error } = await supabaseBrowser().auth.mfa.challengeAndVerify({ factorId, code });
    if (error) return setError("That code didn't match. Codes change every 30 seconds.");
    router.replace("/admin");
    router.refresh();
  }

  return (
    <div className="an-screen flex flex-col gap-5">
      <ShieldCheck size={40} className="text-accent" aria-hidden />
      <Display size={36}>
        {mode === "enrol" ? (
          <>
            Set up <em>two-factor</em>
          </>
        ) : (
          <>
            Verify it&apos;s <em>you</em>
          </>
        )}
      </Display>
      <Lead>
        {mode === "enrol"
          ? "Admin access needs an authenticator app (1Password, Google Authenticator, Authy). Scan this, then enter the 6-digit code."
          : "Enter the 6-digit code from your authenticator app."}
      </Lead>
      {mode === "enrol" && qr && (
        <div className="flex flex-col items-start gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qr}
            alt="QR code for your authenticator app"
            width={200}
            height={200}
            className="rounded-thumb bg-text p-2"
          />
          <div className="mono text-muted text-xs break-all">Or enter this key: {secret}</div>
        </div>
      )}
      {mode !== "loading" && (
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void verify();
          }}
        >
          <Input
            aria-label="6-digit code"
            inputMode="numeric"
            autoComplete="one-time-code"
            mono
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            className="text-center text-2xl tracking-[.4em]"
          />
          <FieldError>{error}</FieldError>
          <Button type="submit" disabled={code.length !== 6}>
            Verify
          </Button>
        </form>
      )}
      {mode === "loading" && <div className="an-skel rounded-card bg-s2 h-40" />}
    </div>
  );
}
