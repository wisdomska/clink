"use client";
import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import {
  Eye,
  EyeSlash,
  LockKey,
  ShieldCheck,
  Warning,
  ArrowRight,
  ChartLineUp,
  Flag,
  Database,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError } from "@/components/ui/field";
import { feedback } from "@/lib/feedback";
import { cn } from "@/components/ui/cn";
import { BrandPoster, type Moment } from "@/components/brand/poster";

const REMEMBER = "clink.adminEmail";

const MOMENTS: Moment[] = [
  {
    icon: <ChartLineUp size={22} weight="fill" />,
    tone: "#FFD08A",
    title: "Sign-ups up 18% this week",
    meta: "Dashboard · live health",
  },
  {
    icon: <Flag size={22} weight="fill" />,
    tone: "#FF4F7B",
    title: "2 reports waiting",
    meta: "Reports · oldest 3 h ago",
  },
  {
    icon: <ShieldCheck size={22} weight="fill" />,
    tone: "#B9A4FF",
    title: "Every look is logged",
    meta: "Audit log · reasons required",
  },
  {
    icon: <Database size={22} weight="fill" />,
    tone: "#FF8A7A",
    title: "Storage at 41% of free tier",
    meta: "Usage · no action needed",
  },
];

/** Admin portal sign-in: its own email and password, not a Clink account. */
export function AdminLogin({ next }: { next: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [caps, setCaps] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [shake, setShake] = useState(0);
  const pwRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(REMEMBER);
      if (saved)
        requestAnimationFrame(() => {
          // Never overwrite something already typed.
          const typed = (document.getElementById("admin-email") as HTMLInputElement | null)?.value;
          if (typed) return;
          setEmail(saved);
          pwRef.current?.focus();
        });
    } catch {
      /* storage blocked */
    }
  }, []);

  return (
    <main className="bg-app grid min-h-dvh lg:grid-cols-[minmax(0,1.08fr)_minmax(0,1fr)]">
      {/* Brand side (desktop) */}
      <aside className="relative hidden p-3 lg:block">
        <div className="sticky top-3 h-[calc(100dvh-24px)]">
          <BrandPoster
            eyebrow="ADMIN"
            moments={MOMENTS}
            headline={
              <>
                Look after every
                <br />
                couple.
              </>
            }
            sub="Health, safety and settings for Clink. Separate from the app, and every action lands in the audit log."
            chips={["Separate sign-in", "Audited access", "After Dark never shown"]}
          />
        </div>
      </aside>

      {/* Form */}
      <div className="flex flex-col items-center justify-center gap-6 px-5 py-6 lg:py-10">
        <div className="w-full max-w-[400px] lg:hidden">
          <BrandPoster
            compact
            eyebrow="ADMIN"
            moments={MOMENTS}
            headline={<>Look after every couple.</>}
          />
        </div>
        <motion.form
          key={shake}
          initial={shake ? { x: 0 } : { opacity: 0.01, y: 16 }}
          animate={shake ? { x: [0, -10, 10, -6, 6, 0] } : { opacity: 1, y: 0 }}
          transition={shake ? { duration: 0.4 } : { type: "spring", stiffness: 300, damping: 28 }}
          className="flex w-full max-w-[400px] flex-col gap-5"
          onSubmit={async (e) => {
            e.preventDefault();
            setError(null);
            if (!email.trim() || !password) return setError("Enter your admin email and password.");
            setBusy(true);
            const r = await fetch("/api/admin/auth/login", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email, password }),
            });
            const d = await r.json().catch(() => ({}));
            if (!r.ok) {
              setBusy(false);
              setLocked(r.status === 429);
              setError(
                d.message ?? "Couldn't sign you in. Check your email and password, then try again.",
              );
              setShake((n) => n + 1);
              feedback("error");
              return;
            }
            try {
              if (remember) localStorage.setItem(REMEMBER, email.trim().toLowerCase());
              else localStorage.removeItem(REMEMBER);
            } catch {
              /* fine */
            }
            feedback("success", "unlock");
            window.location.assign(
              d.mustChange ? `/admin/password?next=${encodeURIComponent(next)}` : next,
            );
          }}
        >
          <div className="flex flex-col gap-2">
            <h1 className="display m-0 text-[40px] leading-[1.05]">Admin sign in</h1>
            <p className="text-muted m-0 text-sm">
              Separate from your Clink account. Signing in here doesn&apos;t sign you into the app.
            </p>
          </div>

          {locked && (
            <div
              role="alert"
              className="bg-danger/12 text-danger flex items-start gap-2 rounded-2xl p-3 text-sm"
            >
              <LockKey size={18} className="mt-0.5 flex-none" aria-hidden />
              Too many tries, so this login is paused for 15 minutes. Try again after that. Every
              attempt is logged.
            </div>
          )}

          <div>
            <Label htmlFor="admin-email">Admin email</Label>
            <Input
              id="admin-email"
              type="email"
              inputMode="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <div>
            <Label htmlFor="admin-password">Password</Label>
            <div className="relative">
              <Input
                ref={pwRef}
                id="admin-password"
                type={show ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyUp={(e) => setCaps(e.getModifierState?.("CapsLock") ?? false)}
                className="pr-12"
              />
              <button
                type="button"
                onClick={() => setShow((v) => !v)}
                aria-label={show ? "Hide password" : "Show password"}
                className="text-muted hover:text-text absolute top-1/2 right-1 flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent"
              >
                {show ? <EyeSlash size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {caps && (
              <div
                className="text-warning mt-1.5 flex items-center gap-1.5 text-xs font-medium"
                role="status"
              >
                <Warning size={14} aria-hidden /> Caps Lock is on
              </div>
            )}
          </div>

          <label className="text-muted flex cursor-pointer items-center gap-2.5 text-sm select-none">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4 accent-[var(--accent)]"
            />
            Remember my email on this device
          </label>

          {!locked && <FieldError>{error}</FieldError>}

          <Button type="submit" loading={busy} className={cn("group")}>
            Sign in to admin
            <ArrowRight
              size={18}
              weight="bold"
              className="transition-transform group-hover:translate-x-1"
              aria-hidden
            />
          </Button>

          <p className="text-faint m-0 text-center text-xs">
            Forgot your admin password? Ask another admin to reset it, or use the setup script.
          </p>
        </motion.form>
      </div>
    </main>
  );
}
