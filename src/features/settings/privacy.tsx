"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CaretRight } from "@phosphor-icons/react";
import { useCouple } from "@/features/couple/context";
import { Toggle } from "@/components/ui/toggle";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError } from "@/components/ui/field";
import { toast } from "@/components/ui/toast";

async function lockApi(body: object) {
  const r = await fetch("/api/me/app-lock", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error((await r.json()).message ?? "Couldn't save that.");
}

/** CHAT-07: discreet mode (blur when away, hide the moon) and an optional PIN on open. */
export function PrivacyCard() {
  const ctx = useCouple();
  const router = useRouter();
  const [discreet, setDiscreet] = useState(ctx.discreet);
  const [locked, setLocked] = useState(ctx.appLock);
  const [sheet, setSheet] = useState<null | "set" | "clear">(null);
  const [pin, setPin] = useState("");
  const [again, setAgain] = useState("");
  const [current, setCurrent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const close = () => {
    setSheet(null);
    setPin("");
    setAgain("");
    setCurrent("");
    setError(null);
  };

  return (
    <>
      <h2 className="m-0 mt-1 text-lg font-bold">Privacy on this phone</h2>
      <div className="rounded-card border-line bg-s1 overflow-hidden border">
        <Toggle
          label="Discreet mode"
          sub="Blur chat when you switch away. Hides the After Dark moon (long-press the wordmark)."
          checked={discreet}
          onChange={async (v) => {
            setDiscreet(v);
            const r = await fetch("/api/me/settings", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ discreet_mode: v }),
            });
            if (!r.ok) {
              setDiscreet(!v);
              return toast("Couldn't save that.");
            }
            router.refresh();
          }}
        />
        <button
          type="button"
          onClick={() => setSheet(locked ? "clear" : "set")}
          className="press text-text hover:text-text flex min-h-14 w-full cursor-pointer items-center justify-between gap-3 bg-transparent px-4 py-2.5 text-left text-base font-medium"
        >
          <span>
            {locked ? "PIN on open is on" : "Ask for a PIN on open"}
            <span className="text-faint block text-[13px] font-normal">
              {locked
                ? "Relocks after 5 minutes in the background."
                : "4 to 8 digits. Separate from your After Dark PIN."}
            </span>
          </span>
          <CaretRight size={18} className="text-faint" aria-hidden />
        </button>
      </div>

      <Sheet
        open={sheet !== null}
        onOpenChange={(v) => !v && close()}
        title={sheet === "clear" ? "Turn off the PIN" : "Set a PIN"}
        handle
      >
        <div className="display text-[28px] leading-[1.05]">
          {sheet === "clear" ? "Turn off the PIN?" : "Set a PIN for Clink"}
        </div>
        {sheet === "set" ? (
          <>
            <div>
              <Label htmlFor="pin-new">New PIN</Label>
              <Input
                id="pin-new"
                inputMode="numeric"
                type="password"
                autoComplete="new-password"
                maxLength={8}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              />
            </div>
            <div>
              <Label htmlFor="pin-again">Same again</Label>
              <Input
                id="pin-again"
                inputMode="numeric"
                type="password"
                autoComplete="new-password"
                maxLength={8}
                value={again}
                onChange={(e) => setAgain(e.target.value.replace(/\D/g, ""))}
              />
            </div>
          </>
        ) : (
          <div>
            <Label htmlFor="pin-current">Current PIN</Label>
            <Input
              id="pin-current"
              inputMode="numeric"
              type="password"
              autoComplete="current-password"
              maxLength={8}
              value={current}
              onChange={(e) => setCurrent(e.target.value.replace(/\D/g, ""))}
            />
          </div>
        )}
        <FieldError>{error}</FieldError>
        <Button
          disabled={
            busy || (sheet === "set" ? pin.length < 4 || again.length < 4 : current.length < 4)
          }
          onClick={async () => {
            if (sheet === "set" && pin !== again) return setError("Those don't match.");
            setBusy(true);
            try {
              if (sheet === "set") {
                await lockApi({ action: "set", pin });
                setLocked(true);
                toast("PIN on. Clink asks for it when it opens.");
              } else {
                await lockApi({ action: "clear", pin: current });
                setLocked(false);
                toast("PIN off.");
              }
              close();
              router.refresh();
            } catch (e) {
              setError(e instanceof Error ? e.message : "Couldn't save that.");
            } finally {
              setBusy(false);
            }
          }}
        >
          {sheet === "set" ? "Turn on" : "Turn off"}
        </Button>
      </Sheet>
    </>
  );
}
