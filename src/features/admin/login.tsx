"use client";
import { useState } from "react";
import { ShieldCheck } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError } from "@/components/ui/field";

/** Admin portal sign-in: its own email and password, not a Clink account. */
export function AdminLogin({ next }: { next: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <main className="mx-auto flex min-h-dvh max-w-[400px] flex-col justify-center px-5 py-10">
      <form
        className="flex flex-col gap-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setError(null);
          setBusy(true);
          const r = await fetch("/api/admin/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
          });
          const d = await r.json().catch(() => ({}));
          if (!r.ok) {
            setBusy(false);
            return setError(d.message ?? "That didn't work. Try again.");
          }
          window.location.assign(
            d.mustChange ? `/admin/password?next=${encodeURIComponent(next)}` : next,
          );
        }}
      >
        <span className="bg-s2 text-accent flex h-14 w-14 items-center justify-center rounded-2xl">
          <ShieldCheck size={28} weight="duotone" aria-hidden />
        </span>
        <div>
          <div className="display text-[34px] leading-[1.05]">
            clink <em>admin</em>
          </div>
          <p className="text-muted m-0 mt-1 text-sm">
            Separate from your Clink account. Signing in here doesn&apos;t sign you into the app.
          </p>
        </div>
        <div>
          <Label htmlFor="admin-email">Admin email</Label>
          <Input
            id="admin-email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="admin-password">Password</Label>
          <Input
            id="admin-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <FieldError>{error}</FieldError>
        <Button type="submit" loading={busy}>
          Sign in to admin
        </Button>
      </form>
    </main>
  );
}
