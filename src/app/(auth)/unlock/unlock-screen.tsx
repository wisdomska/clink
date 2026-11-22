"use client";
import { clearUserCaches } from "@/lib/account-scope";
import { useState } from "react";
import { PinPad, PinDots } from "@/features/dark/pin-pad";
import { Display } from "@/components/ui/heading";
import { Button } from "@/components/ui/button";

/** CHAT-07: the PIN asked for when Clink opens. */
export function UnlockScreen({ next, fresh }: { next: string; fresh: boolean }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (value: string) => {
    setBusy(true);
    const r = await fetch("/api/me/app-lock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "unlock", pin: value }),
    });
    if (r.ok) {
      // Full navigation so the server renders the app with the new cookie.
      window.location.assign(next);
      return;
    }
    const d = await r.json().catch(() => ({}));
    setError(d.message ?? "That's not it.");
    setShake(true);
    setTimeout(() => setShake(false), 400);
    setPin("");
    setBusy(false);
  };

  const onKey = (k: string) => {
    setError(null);
    if (k === "del") return setPin((p) => p.slice(0, -1));
    const p = (pin + k).slice(0, 8);
    setPin(p);
  };

  return (
    <div className="an-screen flex flex-1 flex-col items-center pt-10 text-center">
      <Display size={36}>Enter your PIN</Display>
      <p className="text-muted m-0 mt-2 text-base">Clink is locked on this device.</p>
      <PinDots n={Math.max(4, pin.length)} filled={pin.length} wrong={!!error} shake={shake} />
      <p role="alert" className="text-danger m-0 -mt-5 mb-4 min-h-5 text-sm">
        {error}
      </p>
      <PinPad onKey={onKey} disabled={busy} />
      <Button className="mt-8" loading={busy} disabled={pin.length < 4} onClick={() => submit(pin)}>
        Unlock
      </Button>
      {fresh ? (
        <Button
          variant="text"
          className="mt-4"
          onClick={async () => {
            const r = await fetch("/api/me/app-lock", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "reset" }),
            });
            if (r.ok) window.location.assign(next);
          }}
        >
          Turn the PIN off
        </Button>
      ) : (
        <Button
          variant="text"
          className="mt-4"
          onClick={async () => {
            await clearUserCaches();
            await fetch("/api/auth/signout", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: "{}",
            });
            window.location.assign("/login");
          }}
        >
          Forgot it? Sign out and back in
        </Button>
      )}
    </div>
  );
}
