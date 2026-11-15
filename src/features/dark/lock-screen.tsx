"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { X, Moon, LockKey } from "@phosphor-icons/react";
import { startAuthentication } from "@simplewebauthn/browser";
import { IconButton } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { PinPad, PinDots } from "./pin-pad";
import { useDarkState, darkFetch } from "./api";

/** /dark: PIN, passkey, wrong PIN, locked out (DARK-01). 5 tries, then 15 minutes. */
export function LockScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next");
  const { data: state, refetch } = useDarkState();
  const [pin, setPin] = useState("");
  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [wrong, setWrong] = useState(false);
  const [tries, setTries] = useState<number | null>(null);
  const [lockedOverride, setLockedUntil] = useState<string | null | undefined>(undefined);
  const lockedUntil =
    lockedOverride === undefined ? (state?.me.lockedUntil ?? null) : lockedOverride;
  const [now, setNow] = useState(() => Date.now());
  const reduced =
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    if (state?.unlocked) router.replace(next?.startsWith("/dark/") ? next : "/dark/home");
  }, [state, next, router]);
  useEffect(() => {
    if (!lockedUntil) return;
    const t = setInterval(() => {
      setNow(Date.now());
      if (new Date(lockedUntil).getTime() <= Date.now()) {
        setLockedUntil(null);
        void refetch();
      }
    }, 1000);
    return () => clearInterval(t);
  }, [lockedUntil, refetch]);

  async function submit(p: string) {
    const r = await fetch("/api/dark/unlock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin: p }),
    });
    const d = await r.json();
    if (d.ok) {
      navigator.vibrate?.(20);
      router.replace(next?.startsWith("/dark/") ? next : "/dark/home");
      return;
    }
    if (d.lockedUntil) setLockedUntil(d.lockedUntil);
    setTries(d.triesLeft ?? 0);
    setWrong(true);
    navigator.vibrate?.([40, 40, 40]);
    // Clear the red dots after the shake, unless they have already started typing again.
    if (clearTimer.current) clearTimeout(clearTimer.current);
    clearTimer.current = setTimeout(() => setPin(""), 450);
  }

  function key(k: string) {
    if (lockedUntil) return;
    if (clearTimer.current) {
      clearTimeout(clearTimer.current);
      clearTimer.current = null;
    }
    if (k === "del") {
      setPin((p) => p.slice(0, -1));
      setWrong(false);
      return;
    }
    const p = (wrong ? "" : pin) + k;
    setWrong(false);
    if (p.length > 4) return;
    setPin(p);
    if (p.length === 4) void submit(p);
  }

  async function passkey() {
    try {
      const opts = await darkFetch<Parameters<typeof startAuthentication>[0]["optionsJSON"]>(
        "/api/dark/passkey",
        { action: "auth-options" },
      );
      const response = await startAuthentication({ optionsJSON: opts });
      await darkFetch("/api/dark/passkey", { action: "auth", response });
      router.replace(next?.startsWith("/dark/") ? next : "/dark/home");
    } catch (e) {
      toast(
        e instanceof Error && (e as { code?: string }).code === "no_passkey"
          ? "No passkey here yet. Add one in the hub after unlocking."
          : "That passkey didn't work. Use your PIN.",
      );
    }
  }

  const left = lockedUntil ? Math.max(0, new Date(lockedUntil).getTime() - now) : 0;
  const mm = String(Math.floor(left / 60000)).padStart(2, "0");
  const ss = String(Math.floor((left % 60000) / 1000)).padStart(2, "0");

  return (
    <main className="an-screen mx-auto flex min-h-dvh max-w-[420px] flex-col items-center px-7 pt-[calc(env(safe-area-inset-top)+12px)] pb-10">
      <IconButton label="Close" className="self-start" onClick={() => router.push("/us")}>
        <X size={20} />
      </IconButton>
      <Moon size={36} className="text-ember mt-3" aria-hidden />
      <h1 className="display mt-2.5 mb-0 text-[36px]">
        After <em>Dark</em>
      </h1>
      {lockedUntil ? (
        <div
          className="an-reveal flex flex-1 flex-col items-center justify-center gap-3 text-center"
          role="alert"
        >
          <LockKey size={48} className="text-danger" aria-hidden />
          <div className="display text-[28px] leading-[1.05]">Too many tries.</div>
          <div className="mono text-[48px]" role="timer">
            {mm}:{ss}
          </div>
          <p className="text-muted m-0 text-base leading-normal">
            Take a breath. Everything in here is safe.
          </p>
        </div>
      ) : (
        <>
          <p
            className="mt-2 mb-0 min-h-6 text-base"
            style={{ color: wrong ? "var(--danger)" : "var(--text-muted)" }}
            aria-live="assertive"
          >
            {wrong
              ? `That's not it. ${tries} ${tries === 1 ? "try" : "tries"} left.`
              : "Just the two of you. Enter your PIN."}
          </p>
          <PinDots n={4} filled={pin.length} wrong={wrong} shake={wrong && !reduced} />
          <PinPad onKey={key} passkey={state?.me.passkey ? passkey : undefined} />
          <div className="mono text-faint mt-5 text-xs">AUTO-LOCKS AFTER 2 MIN</div>
        </>
      )}
    </main>
  );
}
