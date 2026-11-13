"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Fingerprint, GoogleLogo, Check } from "@phosphor-icons/react";
import { Button, IconButton } from "@/components/ui/button";
import { Input, Label, FieldError, Hint } from "@/components/ui/field";
import { Display, Lead } from "@/components/ui/heading";
import { supabaseBrowser } from "@/lib/supabase/client";
import { emailSchema } from "@/lib/validation";
import { parseDob, isAdult } from "@/lib/age";
import { toast } from "@/components/ui/toast";

type View = "form" | "sent" | "blocked";

export function AuthScreen({ mode }: { mode: "signup" | "login" }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? (params.get("code") ? "/link?enter=1" : null);
  const [view, setView] = useState<View>(params.get("blocked") ? "blocked" : "form");
  const [email, setEmail] = useState("");
  const [day, setDay] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [dobError, setDobError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(params.get("error") === "link" ? "That link expired or was already used. Send a fresh one." : null);
  const [busy, setBusy] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const monthRef = useRef<HTMLInputElement>(null);
  const yearRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const callback = () => {
    const u = new URL("/auth/callback", window.location.origin);
    if (next) u.searchParams.set("next", next);
    return u.toString();
  };

  async function sendLink() {
    const { error } = await supabaseBrowser().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: callback(), shouldCreateUser: mode === "signup" },
    });
    if (error) {
      if (error.message.toLowerCase().includes("signups not allowed") || error.status === 422) {
        setFormError(mode === "login" ? "No account with that email yet. Make one instead?" : error.message);
      } else if (error.status === 429) {
        setFormError("Too many emails just now. Give it a minute.");
      } else {
        setFormError("We couldn't send that email. Try again in a moment.");
      }
      return false;
    }
    return true;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const parsedEmail = emailSchema.safeParse(email);
    setEmailError(parsedEmail.success ? null : "That email looks off. Missing a dot somewhere?");
    let dobOk = true;
    if (mode === "signup") {
      const dob = parseDob({ day: Number(day), month: Number(month), year: Number(year) });
      dobOk = Boolean(dob);
      setDobError(dob ? null : "That date doesn't exist. Check the day and month.");
      if (!parsedEmail.success || !dob) return;
      setBusy(true);
      try {
        const res = await fetch("/api/auth/age-check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ day: Number(day), month: Number(month), year: Number(year) }),
        });
        const data = await res.json();
        if (!res.ok) {
          setFormError(data.message ?? "Something went wrong.");
          return;
        }
        if (data.blocked || !isAdult(dob)) {
          setView("blocked");
          return;
        }
        if (await sendLink()) {
          setView("sent");
          setResendIn(60);
        }
      } finally {
        setBusy(false);
      }
      return;
    }
    if (!parsedEmail.success || !dobOk) return;
    setBusy(true);
    try {
      if (await sendLink()) {
        setView("sent");
        setResendIn(60);
      }
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    const { error } = await supabaseBrowser().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callback() },
    });
    if (error) toast("Google sign-in isn't available right now.");
  }

  async function passkey() {
    if (!("PublicKeyCredential" in window)) {
      toast("This browser doesn't support passkeys.");
      return;
    }
    const { error } = await supabaseBrowser().auth.signInWithPasskey();
    if (error) {
      toast(
        mode === "signup"
          ? "No passkey here yet. Start with email or Google once, then add one in a tap."
          : "That passkey didn't work. Try email instead.",
      );
      return;
    }
    router.replace(next ?? "/us");
    router.refresh();
  }

  const two = (v: string) => v.replace(/\D/g, "").slice(0, 2);

  return (
    <div className="an-screen flex flex-1 flex-col">
      <IconButton label="Back" onClick={() => (window.history.length > 1 ? router.back() : router.push("/"))}>
        <ArrowLeft size={20} />
      </IconButton>

      {view === "form" && (
        <form onSubmit={onSubmit} noValidate className="flex flex-1 flex-col">
          <Display size={36} className="mt-6">
            {mode === "signup" ? (
              <>
                Make your <em>account</em>
              </>
            ) : (
              <>
                Welcome <em>back</em>
              </>
            )}
          </Display>
          <Lead className="mt-2">
            {mode === "signup" ? "Takes a minute. Clink is 18+ only." : "Pick up where you two left off."}
          </Lead>
          <div className="mt-6 flex flex-col gap-2">
            <Button variant="secondary" size="lg" onClick={passkey}>
              <Fingerprint size={22} aria-hidden />
              Continue with a passkey
            </Button>
            <Button variant="secondary" size="lg" onClick={google}>
              <GoogleLogo size={22} aria-hidden />
              Continue with Google
            </Button>
          </div>
          <div className="mt-6 mb-4 flex items-center gap-3 text-sm font-medium text-faint">
            <span className="h-px flex-1 bg-line" />
            or use email
            <span className="h-px flex-1 bg-line" />
          </div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email webauthn"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            invalid={Boolean(emailError)}
            aria-describedby={emailError ? "email-error" : undefined}
            placeholder="you@example.com"
          />
          <FieldError id="email-error">{emailError}</FieldError>
          {mode === "signup" && (
            <fieldset className="m-0 mt-4 border-0 p-0">
              <legend className="mb-1.5 p-0 text-sm font-medium text-muted">Date of birth</legend>
              <div className="grid grid-cols-[1fr_1fr_1.6fr] gap-2">
                <Input
                  aria-label="Day"
                  inputMode="numeric"
                  autoComplete="bday-day"
                  placeholder="DD"
                  mono
                  className="text-center"
                  value={day}
                  invalid={Boolean(dobError)}
                  onChange={(e) => {
                    const v = two(e.target.value);
                    setDay(v);
                    if (v.length === 2) monthRef.current?.focus();
                  }}
                />
                <Input
                  ref={monthRef}
                  aria-label="Month"
                  inputMode="numeric"
                  autoComplete="bday-month"
                  placeholder="MM"
                  mono
                  className="text-center"
                  value={month}
                  invalid={Boolean(dobError)}
                  onChange={(e) => {
                    const v = two(e.target.value);
                    setMonth(v);
                    if (v.length === 2) yearRef.current?.focus();
                  }}
                />
                <Input
                  ref={yearRef}
                  aria-label="Year"
                  inputMode="numeric"
                  autoComplete="bday-year"
                  placeholder="YYYY"
                  mono
                  className="text-center"
                  value={year}
                  invalid={Boolean(dobError)}
                  onChange={(e) => setYear(e.target.value.replace(/\D/g, "").slice(0, 4))}
                />
              </div>
              <FieldError>{dobError}</FieldError>
              <Hint>We check you&apos;re 18+. Your partner never sees this.</Hint>
            </fieldset>
          )}
          <FieldError>{formError}</FieldError>
          <div className="min-h-6 flex-1" />
          <Button type="submit" disabled={busy} className="mt-6 flex-none">
            {busy ? "One sec" : "Continue"}
          </Button>
          <p className="mt-4 text-center text-sm text-muted">
            {mode === "signup" ? (
              <>
                Already have an account? <Link href={`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`}>Log in</Link>
              </>
            ) : (
              <>
                New here? <Link href={`/signup${next ? `?next=${encodeURIComponent(next)}` : ""}`}>Make an account</Link>
              </>
            )}
          </p>
        </form>
      )}

      {view === "sent" && (
        <>
          <div className="an-reveal flex flex-1 flex-col justify-center gap-4">
            <div
              aria-hidden
              className="relative h-[120px] w-[180px] overflow-hidden rounded-input border border-line bg-s2"
              style={{ transform: "rotate(-3deg)" }}
            >
              <div className="absolute inset-0 bg-s3" style={{ clipPath: "polygon(0 0,100% 0,50% 60%)" }} />
              <div className="absolute top-[60%] left-1/2 -mt-5 -ml-5 flex h-10 w-10 items-center justify-center rounded-full bg-accent text-on-accent">
                <Check size={20} />
              </div>
            </div>
            <Display size={36} className="mt-2">
              Check your <em>inbox</em>
            </Display>
            <Lead>We sent a link to {email}. Tap it on this phone and you&apos;re in.</Lead>
          </div>
          <div className="flex flex-col gap-2">
            <a href={mailAppHref(email)} className="press flex h-14 items-center justify-center rounded-full bg-accent text-base font-bold text-on-accent hover:text-on-accent">
              Open email app
            </a>
            <Button
              variant="text"
              size="lg"
              className="text-faint"
              disabled={resendIn > 0 || busy}
              onClick={async () => {
                setBusy(true);
                if (await sendLink()) {
                  setResendIn(60);
                  toast("Sent again.");
                }
                setBusy(false);
              }}
            >
              {resendIn > 0 ? `Resend in 0:${String(resendIn).padStart(2, "0")}` : "Resend the link"}
            </Button>
          </div>
        </>
      )}

      {view === "blocked" && (
        <>
          <div className="an-reveal flex flex-1 flex-col justify-center gap-4">
            <div className="display flex h-[72px] w-[72px] items-center justify-center rounded-full border-2 border-danger text-[22px] tracking-normal text-danger">
              18+
            </div>
            <Display size={36} className="mt-2">
              Clink is for <em>adults</em>.
            </Display>
            <Lead>Come back when you&apos;re 18. You can&apos;t try again for 24 hours.</Lead>
          </div>
          <Link href="/" className="press flex h-[52px] items-center justify-center rounded-full border border-line bg-s2 text-base font-medium text-text hover:text-text">
            Back to the start
          </Link>
        </>
      )}
    </div>
  );
}

function mailAppHref(email: string) {
  const domain = email.split("@")[1] ?? "";
  if (domain === "gmail.com" || domain === "googlemail.com") return "https://mail.google.com/mail/u/0/#inbox";
  if (/(outlook|hotmail|live)\./.test(domain)) return "https://outlook.live.com/mail/";
  if (domain.includes("yahoo.")) return "https://mail.yahoo.com/";
  if (domain === "icloud.com" || domain === "me.com") return "https://www.icloud.com/mail";
  return "mailto:";
}
