"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Moon,
  LockSimple,
  Fire,
  Cards,
  Vault,
  EnvelopeSimpleOpen,
  Heart,
  Fingerprint,
  ShieldWarning,
  CheckCircle,
  CircleDashed,
} from "@phosphor-icons/react";
import { startRegistration } from "@simplewebauthn/browser";
import { useQuery } from "@tanstack/react-query";
import { useCouple } from "@/features/couple/context";
import { Display, Lead } from "@/components/ui/heading";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { toast } from "@/components/ui/toast";
import { TIERS, tierStatus, type Tier } from "@/lib/dark-logic";
import { useDarkState, darkFetch } from "./api";

const STATUS_COPY = {
  open: "Unlocked",
  waiting_on_them: "Waiting on them. No rush.",
  waiting_on_you: "Waiting on you",
  waiting_on_both: "Not yet",
  needs_verification: "Needs you both verified",
} as const;

export function DarkHub() {
  const router = useRouter();
  const { me, partner } = useCouple();
  const { data: s } = useDarkState();
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const { data: vault } = useQuery({
    queryKey: ["vault"],
    queryFn: () => darkFetch<{ items: Array<{ removed: boolean }> }>("/api/dark/vault"),
    enabled: (s?.rank ?? 0) > 0,
  });
  const { data: req } = useQuery({
    queryKey: ["requests"],
    queryFn: () =>
      darkFetch<{ inbox: Array<{ id: string; status: string }> }>("/api/dark/requests"),
    enabled: (s?.rank ?? 0) > 0,
  });
  const rank = s?.rank ?? 0;
  const pending = req?.inbox.filter((r) => r.status === "pending" || r.status === "later") ?? [];
  const kept = vault?.items.filter((v) => !v.removed).length ?? 0;

  function tierCount(t: Tier) {
    return { Flirty: "54 cards", Steamy: "54 cards", Spicy: "53 cards", Unhinged: "54 cards" }[t];
  }

  return (
    <main className="an-screen mx-auto flex min-h-dvh w-full max-w-[1100px] flex-col gap-5 px-4 pt-[calc(env(safe-area-inset-top)+4px)] pb-10 md:px-8 md:pt-8">
      <div className="flex h-11 items-center justify-between">
        <div className="mono text-ember flex items-center gap-1.5 text-xs">
          <Moon size={16} aria-hidden />
          PRIVATE · YOU AND {partner.name.toUpperCase()}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={async () => {
            await fetch("/api/dark/lock", { method: "POST" });
            router.replace("/us");
          }}
        >
          <LockSimple size={18} aria-hidden /> Lock
        </Button>
      </div>
      <div>
        <Display size={48}>
          After <em>Dark</em>
        </Display>
        <Lead className="mt-1.5">Only you two can see this. The lower choice always wins.</Lead>
      </div>
      {s && !s.partner.optedIn && (
        <div className="rounded-card border-line bg-s1 text-muted border p-4 text-base">
          {partner.name} hasn&apos;t opened After Dark yet. It stays quiet until they do. No nudges
          from us.
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-10">
        <div className="flex flex-col px-1.5 py-1" role="group" aria-label="Tiers">
          {TIERS.map((t, i) => {
            const st = s
              ? tierStatus(t, s.me.tiers, s.partner.tiers, s.me.verified, s.partner.verified)
              : "waiting_on_both";
            const open = st === "open";
            const sub = open
              ? tierCount(t)
              : st === "needs_verification"
                ? "Quick 18+ check for you both"
                : st === "waiting_on_you"
                  ? `${partner.name} opted in`
                  : "";
            return (
              <button
                key={t}
                type="button"
                onClick={() => {
                  if (open) return router.push(`/dark/decks/${t}`);
                  if (st === "needs_verification" || (t === "Unhinged" && !s?.me.verified))
                    return setVerifyOpen(true);
                  router.push("/dark/consent");
                }}
                className="press rounded-card border-line bg-s2 text-text relative flex h-[104px] cursor-pointer items-start justify-between gap-2.5 overflow-hidden border px-[18px] pt-4 pb-[26px] text-left"
                style={{
                  zIndex: i + 1,
                  marginTop: i ? -22 : 0,
                  transform: `rotate(${[-2, 1.5, -1, 2][i]}deg)`,
                  boxShadow: "var(--shadow-matchbook)",
                }}
              >
                <span className="display text-[28px]">{t}</span>
                <span className="flex flex-col items-end gap-0.5 text-right">
                  <span className="text-sm font-medium">{STATUS_COPY[st]}</span>
                  {sub && <span className="text-muted text-xs">{sub}</span>}
                </span>
                <span
                  aria-hidden
                  className="border-line absolute inset-x-0 bottom-0 h-4 border-t"
                  style={{
                    background:
                      "repeating-linear-gradient(90deg,rgba(255,90,60,.5) 0 2px,#211E25 2px 5px)",
                  }}
                />
                {!open && (
                  <span
                    aria-hidden
                    className="rounded-card absolute inset-0 border border-[rgba(244,240,245,.2)]"
                    style={{
                      background:
                        "repeating-linear-gradient(115deg,rgba(244,240,245,.07) 0 2px,transparent 2px 16px)",
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>
        <div className="flex flex-col gap-2.5">
          <div className="grid grid-cols-[1.2fr_1fr] grid-rows-[auto_auto] gap-2.5">
            <button
              type="button"
              disabled={!rank}
              onClick={() => router.push("/dark/wheel")}
              className="press rounded-card bg-ember text-on-accent row-span-2 flex min-h-[200px] cursor-pointer flex-col justify-between border-0 p-[18px] text-left disabled:opacity-50"
            >
              <Fire size={30} aria-hidden />
              <span className="display text-[28px] leading-none">
                Dare
                <br />
                wheel
              </span>
            </button>
            <button
              type="button"
              disabled={!rank}
              onClick={() => router.push("/dark/decks/Flirty")}
              className="press rounded-card border-line bg-s1 text-text flex cursor-pointer flex-col gap-3 border p-3.5 text-left disabled:opacity-50"
            >
              <Cards size={22} className="text-ember" aria-hidden />
              <span className="text-base font-bold">Spicy deck</span>
            </button>
            <button
              type="button"
              disabled={!rank}
              onClick={() => router.push("/dark/vault")}
              className="press rounded-card border-line bg-s1 text-text flex cursor-pointer flex-col gap-3 border p-3.5 text-left disabled:opacity-50"
            >
              <Vault size={22} className="text-ember" aria-hidden />
              <span className="text-base font-bold">Vault · {kept}</span>
            </button>
          </div>
          <Link
            href="/dark/match"
            aria-disabled={!rank}
            className="press rounded-card border-line bg-s1 text-text hover:text-text flex items-center gap-3 border px-4 py-3.5"
          >
            <Heart size={22} className="text-ember" aria-hidden />
            <span className="flex-1 text-base font-bold">Desire match</span>
            <span className="text-muted text-sm">Only the yeses</span>
          </Link>
          <Link
            href="/dark/request"
            className="press rounded-card border-line bg-s1 text-text hover:text-text flex items-center gap-3 border px-4 py-3.5"
          >
            <EnvelopeSimpleOpen size={22} className="text-ember" aria-hidden />
            <span className="flex-1 text-base font-bold">
              {pending.length ? `${partner.name} sent you a request` : "Requests"}
            </span>
            {pending.length > 0 && (
              <span role="img" className="bg-ember h-2 w-2 rounded-full" aria-label="New" />
            )}
          </Link>
          <div className="mt-2 flex flex-wrap gap-2">
            {s && !s.me.passkey && (
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  try {
                    const opts = await darkFetch<
                      Parameters<typeof startRegistration>[0]["optionsJSON"]
                    >("/api/dark/passkey", { action: "register-options" });
                    const response = await startRegistration({ optionsJSON: opts });
                    await darkFetch("/api/dark/passkey", { action: "register", response });
                    toast("Passkey added. Unlock with your face or fingerprint next time.");
                  } catch {
                    toast("Passkey not added. Your PIN still works.");
                  }
                }}
              >
                <Fingerprint size={18} aria-hidden /> Use a passkey
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => router.push("/dark/consent")}>
              Change tiers
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-danger"
              onClick={() => setBlockOpen(true)}
            >
              <ShieldWarning size={18} aria-hidden /> Report or block
            </Button>
          </div>
        </div>
      </div>
      <VerifySheet
        open={verifyOpen}
        onOpenChange={setVerifyOpen}
        partnerVerified={Boolean(s?.partner.verified)}
        meVerified={Boolean(s?.me.verified)}
      />
      <Sheet open={blockOpen} onOpenChange={setBlockOpen} title="Report or block" handle>
        <div className="display text-[28px] leading-[1.05]">Something not okay?</div>
        <p className="text-muted m-0 text-base leading-normal">
          Blocking unlinks you straight away and wipes every private item for both of you within an
          hour. {partner.name} gets a short, neutral notice.
        </p>
        <Button
          variant="secondary"
          size="lg"
          onClick={() => router.push("/help?report=1&from=dark")}
        >
          Report privately
        </Button>
        <Button
          variant="danger"
          size="lg"
          onClick={async () => {
            const r = await fetch("/api/couple/block", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: "{}",
            });
            if (r.ok) window.location.href = "/link";
          }}
        >
          Block and unlink
        </Button>
      </Sheet>
    </main>
  );
}

export function VerifySheet({
  open,
  onOpenChange,
  meVerified,
  partnerVerified,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  meVerified: boolean;
  partnerVerified: boolean;
}) {
  const { partner } = useCouple();
  const [agree, setAgree] = useState(false);
  const { data } = useQuery({
    queryKey: ["declaration"],
    queryFn: async () =>
      (await fetch("/api/dark/verify-age")).json() as Promise<{ declaration: string }>,
  });
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Age verification" handle>
      <div className="display text-[28px] leading-[1.05]">
        Unhinged needs you <em>both</em> verified
      </div>
      <div className="flex flex-col gap-3 text-base font-medium">
        <div className="flex items-center gap-2.5">
          <CheckCircle size={22} className="text-ember" aria-hidden /> Date of birth, done at
          sign-up
        </div>
        <div className="flex items-center gap-2.5">
          {meVerified ? (
            <CheckCircle size={22} className="text-ember" aria-hidden />
          ) : (
            <CircleDashed size={22} className="text-muted" aria-hidden />
          )}{" "}
          Your 18+ declaration
        </div>
        <div className="flex items-center gap-2.5">
          <span className="flex w-[22px] justify-center">
            <span
              className="h-3 w-3"
              style={{
                background: partnerVerified ? "var(--partner-b)" : "transparent",
                border: "1.5px solid var(--partner-b)",
              }}
            />
          </span>
          {partner.name} {partnerVerified ? "is verified" : "hasn't verified yet"}
        </div>
      </div>
      {!meVerified && (
        <label className="rounded-input border-line bg-s2 flex cursor-pointer items-start gap-3 border p-3.5 text-sm leading-normal">
          <input
            type="checkbox"
            checked={agree}
            onChange={(e) => setAgree(e.target.checked)}
            className="mt-0.5 h-5 w-5 flex-none accent-[var(--accent-dark)]"
          />
          {data?.declaration}
        </label>
      )}
      <p className="text-faint m-0 text-sm leading-normal">
        We keep the signed declaration, not an ID. A full ID and selfie check is planned for later.
      </p>
      {!meVerified ? (
        <Button
          disabled={!agree}
          onClick={async () => {
            const r = await fetch("/api/dark/verify-age", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ declaration: data?.declaration }),
            });
            if (!r.ok) return toast.err((await r.json()).message);
            onOpenChange(false);
            toast(
              partnerVerified
                ? "Verified. Turn on Unhinged in your tiers if you both want it."
                : `Verified. Unhinged opens when ${partner.name} verifies too.`,
            );
          }}
        >
          Sign and verify
        </Button>
      ) : (
        <Button variant="secondary" onClick={() => onOpenChange(false)}>
          Okay
        </Button>
      )}
      <Button variant="text" size="md" onClick={() => onOpenChange(false)}>
        Not now
      </Button>
    </Sheet>
  );
}
