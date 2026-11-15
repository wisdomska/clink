"use client";
import { useState } from "react";
import { Check, Eye, EyeSlash, LockKey } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError } from "@/components/ui/field";
import { Display, Lead } from "@/components/ui/heading";
import { toast } from "@/components/ui/toast";
import { supabaseBrowser } from "@/lib/supabase/client";
import { feedback } from "@/lib/feedback";

const RULES = [
  { test: (p: string) => p.length >= 12, label: "12 characters or more" },
  { test: (p: string) => /[a-z]/.test(p) && /[A-Z]/.test(p), label: "Upper and lower case" },
  { test: (p: string) => /[0-9]/.test(p), label: "A number" },
];

/** Set a new password. Forced after signing in with a temporary one. */
export function PasswordScreen({
  forced,
  next,
  email,
}: {
  forced: boolean;
  next: string;
  email: string;
}) {
  const [pw, setPw] = useState("");
  const [again, setAgain] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const ok = RULES.every((r) => r.test(pw));

  return (
    <form
      className="an-screen flex flex-1 flex-col"
      onSubmit={async (e) => {
        e.preventDefault();
        setError(null);
        if (!ok) return setError("Your password needs everything on the list.");
        if (pw !== again) return setError("Those two don't match.");
        setBusy(true);
        const r = await fetch("/api/me/password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password: pw }),
        });
        if (!r.ok) {
          setBusy(false);
          return setError((await r.json().catch(() => ({}))).message ?? "That didn't save.");
        }
        // Pick up the cleared "must change" flag before moving on.
        await supabaseBrowser().auth.refreshSession();
        feedback("success", "success");
        toast.ok("Password saved.");
        window.location.assign(next);
      }}
    >
      <span className="bg-s2 text-accent flex h-14 w-14 items-center justify-center rounded-2xl">
        <LockKey size={28} weight="duotone" aria-hidden />
      </span>
      <Display size={36} className="mt-5">
        {forced ? (
          <>
            Choose your <em>own</em> password
          </>
        ) : (
          <>
            New <em>password</em>
          </>
        )}
      </Display>
      <Lead className="mt-2">
        {forced
          ? "You signed in with a temporary password. Set yours to carry on."
          : "Use it with your email to sign in on any device."}
      </Lead>
      {/* Lets password managers save the new password against the right account. */}
      <input type="email" name="username" autoComplete="username" value={email} readOnly hidden />
      <div className="mt-6 flex flex-col gap-4">
        <div>
          <Label htmlFor="pw">New password</Label>
          <div className="relative">
            <Input
              id="pw"
              type={show ? "text" : "password"}
              autoComplete="new-password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              className="pr-12"
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              aria-label={show ? "Hide password" : "Show password"}
              className="text-muted hover:text-text absolute top-1/2 right-1 flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full"
            >
              {show ? <EyeSlash size={20} /> : <Eye size={20} />}
            </button>
          </div>
          <ul className="m-0 mt-2 flex list-none flex-col gap-1 p-0 text-sm">
            {RULES.map((r) => {
              const met = r.test(pw);
              return (
                <li
                  key={r.label}
                  className="flex items-center gap-2 transition-colors duration-200"
                  style={{ color: met ? "var(--accent)" : "var(--text-muted)" }}
                >
                  <Check size={14} weight="bold" aria-hidden style={{ opacity: met ? 1 : 0.35 }} />
                  {r.label}
                  <span className="sr-only">{met ? "(done)" : "(not yet)"}</span>
                </li>
              );
            })}
          </ul>
        </div>
        <div>
          <Label htmlFor="pw2">Type it again</Label>
          <Input
            id="pw2"
            type={show ? "text" : "password"}
            autoComplete="new-password"
            value={again}
            onChange={(e) => setAgain(e.target.value)}
          />
        </div>
        <FieldError>{error}</FieldError>
      </div>
      <div className="min-h-6 flex-1" />
      <Button type="submit" loading={busy} className="mt-6">
        Save password
      </Button>
    </form>
  );
}
