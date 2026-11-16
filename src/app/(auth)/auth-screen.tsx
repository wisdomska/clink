"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Fingerprint, Check, ShieldCheck } from "@phosphor-icons/react";
import { BrandLogo } from "@/components/clink/brand-logo";
import { motion } from "motion/react";
import { cn } from "@/components/ui/cn";

const ITEM = {
  hidden: { opacity: 0.01, y: 14 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 320, damping: 28 } },
};
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
  const [password, setPassword] = useState("");
  const [day, setDay] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [dobError, setDobError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(
    params.get("error") === "link"
      ? "That link expired or was already used. Send a fresh one."
      : null,
  );
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
        setFormError(
          mode === "login" ? "No account with that email yet. Make one instead?" : error.message,
        );
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
      if (password) {
        const { error } = await supabaseBrowser().auth.signInWithPassword({ email, password });
        if (error) {
          setFormError(
            error.status === 429
              ? "Too many tries just now. Give it a minute."
              : "That email and password don't match. Leave the password empty to get a link instead.",
          );
          return;
        }
        // A temporary password goes to the change screen first (proxy), then on.
        const land = await fetch(
          `/api/me/landing${next ? `?next=${encodeURIComponent(next)}` : ""}`,
        )
          .then((r) => r.json())
          .catch(() => ({ to: "/us" }));
        window.location.assign(land.to ?? "/us");
        return;
      }
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
    if (error) toast.err("Google sign-in isn't available right now.");
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

  const q = next ? `?next=${encodeURIComponent(next)}` : "";
  return (
    <div className="relative isolate flex flex-1 flex-col lg:flex-none">
      <div className="relative flex items-center gap-3 lg:mb-8">
        <IconButton
          label="Back"
          onClick={() => (window.history.length > 1 ? router.back() : router.push("/"))}
        >
          <ArrowLeft size={20} />
        </IconButton>
        {view === "form" && (
          <nav
            aria-label="Account"
            className="bg-s2/80 ml-auto flex rounded-full p-1 backdrop-blur"
          >
            {(
              [
                ["login", "Sign in", `/login${q}`],
                ["signup", "Create account", `/signup${q}`],
              ] as const
            ).map(([k, label, href]) => (
              <Link
                key={k}
                href={href}
                replace
                aria-current={mode === k ? "page" : undefined}
                className="relative flex h-9 items-center rounded-full px-3.5 text-[13px] font-bold"
              >
                {mode === k && (
                  <motion.span
                    layoutId="auth-tab"
                    className="bg-accent absolute inset-0 rounded-full"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
                <span className={cn("relative", mode === k ? "text-on-accent" : "text-muted")}>
                  {label}
                </span>
              </Link>
            ))}
          </nav>
        )}
      </div>

      {view === "form" && (
        <motion.form
          onSubmit={onSubmit}
          noValidate
          className="relative flex flex-1 flex-col lg:flex-none"
          initial="hidden"
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.06, delayChildren: 0.15 } } }}
        >
          <motion.div variants={ITEM}>
            <Display size={48} className="mt-6 lg:mt-2">
              {mode === "signup" ? <>Make your account</> : <>Welcome back</>}
            </Display>
            <Lead className="mt-2">
              {mode === "signup"
                ? "Takes a minute. Clink is 18+ only."
                : "Pick up where you two left off."}
            </Lead>
          </motion.div>
          <motion.div variants={ITEM} className="mt-6 flex flex-col gap-2">
            <Button variant="secondary" size="lg" onClick={passkey}>
              <Fingerprint size={22} aria-hidden />
              Continue with a passkey
            </Button>
            <Button variant="secondary" size="lg" onClick={google}>
              <BrandLogo brand="google" size={26} />
              Continue with Google
            </Button>
          </motion.div>
          <motion.div
            variants={ITEM}
            className="text-faint mt-6 mb-4 flex items-center gap-3 text-sm font-medium"
          >
            <span className="bg-line h-px flex-1" />
            or use email
            <span className="bg-line h-px flex-1" />
          </motion.div>
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
          {mode === "login" && (
            <div className="mt-4">
              <Label htmlFor="password">
                Password <span className="text-faint font-normal">(optional)</span>
              </Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <Hint>Leave it empty and we&apos;ll email you a sign-in link.</Hint>
            </div>
          )}
          {mode === "signup" && (
            <fieldset className="m-0 mt-4 border-0 p-0">
              <legend className="text-muted mb-1.5 p-0 text-sm font-medium">Date of birth</legend>
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
          <div className="min-h-6 flex-1 lg:min-h-0 lg:flex-none" />
          <Button type="submit" loading={busy} className="group mt-6 flex-none">
            {mode === "login" && password ? "Sign in" : "Continue"}
            <ArrowRight
              size={18}
              weight="bold"
              aria-hidden
              className="transition-transform duration-200 group-hover:translate-x-1"
            />
          </Button>
          <p className="text-faint m-0 mt-4 flex items-start justify-center gap-1.5 text-center text-xs leading-relaxed">
            <ShieldCheck
              size={14}
              weight="fill"
              className="text-accent mt-0.5 flex-none"
              aria-hidden
            />
            <span>
              By continuing you agree to our{" "}
              <Link href="/terms" className="text-muted underline underline-offset-2">
                Terms
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="text-muted underline underline-offset-2">
                Privacy policy
              </Link>
              .
            </span>
          </p>
        </motion.form>
      )}

      {view === "sent" && (
        <>
          <div className="an-reveal flex flex-1 flex-col justify-center py-10">
            <div aria-hidden className="relative h-[140px] w-[160px]">
              <motion.img
                src="/stickers/xoxo.webp"
                alt=""
                className="absolute inset-0 h-full w-full object-contain drop-shadow-[0_12px_16px_rgba(0,0,0,.35)]"
                initial={{ y: 60, rotate: -20, scale: 0.6, opacity: 0.01 }}
                animate={{ y: [60, -10, 0], rotate: [-20, 8, -4], scale: 1, opacity: 1 }}
                transition={{ duration: 0.9, ease: [0.2, 0.9, 0.3, 1.2] }}
              />
              <motion.span
                className="bg-accent text-on-accent border-app absolute -right-1 bottom-2 flex h-11 w-11 items-center justify-center rounded-full border-[3px]"
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.15, 1] }}
                transition={{ delay: 0.7, duration: 0.4 }}
              >
                <Check size={22} weight="bold" />
              </motion.span>
            </div>
            <Display size={36} className="mt-10">
              Check your inbox
            </Display>
            <Lead className="mt-4 max-w-[34ch]">
              We sent a link to <span className="text-text font-medium break-all">{email}</span>.
              Tap it on this device and you&apos;re in.
            </Lead>
          </div>
          <div className="mt-12 flex flex-col gap-4 pb-2">
            <a
              href={mailAppHref(email)}
              className="press bg-accent text-on-accent hover:text-on-accent flex h-14 items-center justify-center rounded-full text-base font-bold"
            >
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
              {resendIn > 0
                ? `Resend in 0:${String(resendIn).padStart(2, "0")}`
                : "Resend the link"}
            </Button>
          </div>
        </>
      )}

      {view === "blocked" && (
        <>
          <div className="an-reveal flex flex-1 flex-col justify-center gap-4">
            <div className="display border-danger text-danger flex h-[72px] w-[72px] items-center justify-center rounded-full border-2 text-[22px] tracking-normal">
              18+
            </div>
            <Display size={36} className="mt-2">
              Clink is for adults.
            </Display>
            <Lead>Come back when you&apos;re 18. You can&apos;t try again for 24 hours.</Lead>
          </div>
          <Link
            href="/"
            className="press border-line bg-s2 text-text hover:text-text flex h-[52px] items-center justify-center rounded-full border text-base font-medium"
          >
            Back to the start
          </Link>
        </>
      )}
    </div>
  );
}

function mailAppHref(email: string) {
  const domain = email.split("@")[1] ?? "";
  if (domain === "gmail.com" || domain === "googlemail.com")
    return "https://mail.google.com/mail/u/0/#inbox";
  if (/(outlook|hotmail|live)\./.test(domain)) return "https://outlook.live.com/mail/";
  if (domain.includes("yahoo.")) return "https://mail.yahoo.com/";
  if (domain === "icloud.com" || domain === "me.com") return "https://www.icloud.com/mail";
  return "mailto:";
}
