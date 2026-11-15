"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError, Hint } from "@/components/ui/field";
import { toast } from "@/components/ui/toast";

/**
 * Your admin login: change the email, name and password. Forced on first
 * sign-in with a temporary password. Always asks for the current password.
 */
export function AdminAccountForm({
  forced = false,
  next = "/admin",
}: {
  forced?: boolean;
  next?: string;
}) {
  const [me, setMe] = useState<{ email: string; name: string } | null>(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [current, setCurrent] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void fetch("/api/admin/account")
      .then((r) => r.json())
      .then((d) => {
        setMe(d);
        setEmail(d.email ?? "");
        setName(d.name ?? "");
      });
  }, []);

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setError(null);
        if (pw && pw !== pw2) return setError("The new passwords don't match.");
        if (forced && !pw) return setError("Choose a new password.");
        setBusy(true);
        const body: Record<string, string> = { current };
        if (email && email !== me?.email) body.email = email;
        if (name && name !== me?.name) body.name = name;
        if (pw) body.password = pw;
        const r = await fetch("/api/admin/account", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const d = await r.json().catch(() => ({}));
        setBusy(false);
        if (!r.ok) return setError(d.message ?? "That didn't save.");
        toast.ok("Admin account saved.");
        setCurrent("");
        setPw("");
        setPw2("");
        if (forced) window.location.assign(next);
        else setMe({ email, name });
      }}
    >
      <div>
        <div className="display text-[30px] leading-[1.05]">
          {forced ? (
            <>
              Choose your <em>own</em> password
            </>
          ) : (
            <>
              Your admin <em>login</em>
            </>
          )}
        </div>
        <p className="text-muted m-0 mt-1 text-sm">
          {forced
            ? "You signed in with a temporary password. Set yours to open the portal."
            : "Only for the admin portal. Your Clink account keeps its own email and password."}
        </p>
      </div>
      {!forced && (
        <>
          <div>
            <Label htmlFor="adm-name">Name</Label>
            <Input
              id="adm-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
            />
          </div>
          <div>
            <Label htmlFor="adm-email">Admin email</Label>
            <Input
              id="adm-email"
              type="email"
              autoComplete="username"
              value={email}
              disabled={!me}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </>
      )}
      <div>
        <Label htmlFor="adm-new">{forced ? "New password" : "New password (optional)"}</Label>
        <Input
          id="adm-new"
          type="password"
          autoComplete="new-password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
        />
        <Hint>12+ characters with upper and lower case and a number.</Hint>
      </div>
      {pw && (
        <div>
          <Label htmlFor="adm-new2">Type it again</Label>
          <Input
            id="adm-new2"
            type="password"
            autoComplete="new-password"
            value={pw2}
            onChange={(e) => setPw2(e.target.value)}
          />
        </div>
      )}
      <div>
        <Label htmlFor="adm-current">Current password</Label>
        <Input
          id="adm-current"
          type="password"
          autoComplete="current-password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
        />
      </div>
      <FieldError>{error}</FieldError>
      <Button type="submit" loading={busy} disabled={!current}>
        Save
      </Button>
    </form>
  );
}
