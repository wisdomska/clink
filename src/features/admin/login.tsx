"use client";
import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Eye, EyeSlash, LockKey, ShieldCheck, Warning, ArrowRight } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError } from "@/components/ui/field";
import { feedback } from "@/lib/feedback";
import { cn } from "@/components/ui/cn";

const REMEMBER = "clink.adminEmail";

const POINTS = [
  {
    art: "admin-bar-chart",
    title: "Live health",
    text: "Sign-ups, activity and free-tier usage at a glance.",
  },
  {
    art: "admin-shield",
    title: "Safety first",
    text: "Reports, suspensions and audited actions in one place.",
  },
  {
    art: "admin-locked-with-key",
    title: "Separate sign-in",
    text: "This login never opens the Clink app, and the app never opens this.",
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
          setEmail(saved);
          pwRef.current?.focus();
        });
    } catch {
      /* storage blocked */
    }
  }, []);

  return (
    <main className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      {/* Brand side (desktop) */}
      <section
        aria-hidden
        className="relative hidden overflow-hidden p-12 lg:flex lg:flex-col lg:justify-between"
        style={{
          background:
            "radial-gradient(80% 60% at 15% 10%, color-mix(in oklab, var(--accent) 35%, transparent), transparent 60%), radial-gradient(70% 60% at 90% 90%, color-mix(in oklab, var(--partner-b) 25%, transparent), transparent 60%), var(--surface-1)",
        }}
      >
        <div className="display text-[34px]">
          clink <em>admin</em>
        </div>
        <div className="flex flex-col gap-5">
          {POINTS.map((p, i) => (
            <motion.div
              key={p.title}
              initial={{ opacity: 0.01, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + i * 0.1, type: "spring", stiffness: 260, damping: 26 }}
              className="flex items-center gap-4"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/art/${p.art}.webp`}
                alt=""
                className="h-16 w-16 object-contain drop-shadow-[0_10px_14px_rgba(0,0,0,.4)]"
              />
              <div>
                <div className="text-lg font-bold">{p.title}</div>
                <div className="text-muted max-w-[34ch] text-sm">{p.text}</div>
              </div>
            </motion.div>
          ))}
        </div>
        <div className="text-faint text-xs">Every admin action is written to the audit log.</div>
      </section>

      {/* Form */}
      <div className="flex items-center justify-center px-5 py-10">
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
              setError(d.message ?? "That didn't work. Try again.");
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
          <div className="flex flex-col gap-3">
            <span className="bg-accent/15 text-accent flex h-14 w-14 items-center justify-center rounded-2xl">
              <ShieldCheck size={30} weight="duotone" aria-hidden />
            </span>
            <h1 className="display m-0 text-[34px] leading-[1.05]">
              Admin <em>sign in</em>
            </h1>
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
              This login is paused for 15 minutes after too many tries. Every attempt is logged.
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
